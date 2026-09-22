import { maskDob, maskDocumentNumber, maskName } from '../utils/masking.js'

const DOCUMENT_TYPE_LABELS = {
  PASSPORT: 'Passport',
  VISA: 'Visa',
  AADHAAR: 'Aadhaar',
  AADHAAR_PAN: 'Aadhaar / PAN',
  NATIONAL_ID: 'National ID',
  PERMIT: 'Permit'
}

const SIGNAL_WEIGHTS = {
  classification: 0.18,
  ocr: 0.18,
  mrz: 0.16,
  forensic: 0.14,
  biometric: 0.34
}

export const FLAG_REASONS = [
  { id: 'FRAUD_SUSPECTED', label: 'Fraud suspected' },
  { id: 'DOCUMENT_UNCLEAR', label: 'Document unclear' },
  { id: 'ID_MISMATCH', label: 'Identity mismatch' },
  { id: 'OTHER', label: 'Other' }
]

export const REJECT_REASONS = [
  { id: 'BIOMETRIC_MISMATCH', label: 'Biometric mismatch' },
  { id: 'DOCUMENT_TAMPERING', label: 'Document tampering suspected' },
  { id: 'FRAUD_CONFIRMED', label: 'Known fraud indicator' },
  { id: 'INSUFFICIENT_EVIDENCE', label: 'Evidence insufficient' },
  { id: 'OTHER', label: 'Other' }
]

export function extractSubjectFields(analysis) {
  const metadata = analysis?.metadata || {}
  const parsed = analysis?.mrz?.parsed || {}
  return {
    name: metadata.holder_name || metadata.full_name || metadata.name || [parsed.given_names, parsed.surname].filter(Boolean).join(' ') || '',
    dob: metadata.date_of_birth || parsed.birth_date || '',
    documentNumber: metadata.passport_number || metadata.pan_numbers?.[0] || parsed.passport_number || '',
    nationality: metadata.nationality || parsed.nationality || ''
  }
}

export function normalizeDocumentType(type) {
  if (type === 'VISA') return 'VISA'
  if (type === 'AADHAAR_PAN') return 'AADHAAR'
  if (type === 'NATIONAL_ID') return 'PERMIT'
  return type || 'PASSPORT'
}

export function documentTypeLabel(type) {
  return DOCUMENT_TYPE_LABELS[type] || String(type || 'Document').replaceAll('_', ' ')
}

export function createFaceEvidenceReference() {
  const identifier = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return `FACE-REF-${identifier.slice(0, 8).toUpperCase()}`
}

function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(Number(value))) return min
  return Math.min(max, Math.max(min, Number(value)))
}

function round(value, precision = 1) {
  const factor = 10 ** precision
  return Math.round(Number(value || 0) * factor) / factor
}

function statusFromScore(score) {
  if (score == null) return 'UNMEASURED'
  if (score >= 80) return 'PASS'
  if (score >= 45) return 'REVIEW'
  return 'FAIL'
}

function toneFromScore(score) {
  if (score == null) return 'muted'
  if (score >= 80) return 'good'
  if (score >= 45) return 'review'
  return 'critical'
}

function classifierSignal(analysis = {}) {
  const classifier = analysis.classifier || {}
  const passport = classifier.models?.passport
  const rawScore = Number.isFinite(Number(classifier.confidence))
    ? Number(classifier.confidence) * 100
    : passport ? Number(passport.expected ? passport.confidence : 1 - passport.confidence) * 100 : null
  const score = rawScore == null ? null : clamp(rawScore)
  return {
    id: 'classification',
    label: 'Classification',
    color: '#2563eb',
    score,
    status: statusFromScore(score),
    source: 'Document classifier',
    detail: classifier.document_type ? `Classifier returned ${classifier.document_type}.` : 'Classifier output was not returned.',
    trace: [
      ['Model document type', classifier.document_type || 'Not returned'],
      ['Expected document', classifier.expected_document == null ? 'Unknown' : classifier.expected_document ? 'Yes' : 'No'],
      ['Confidence', score == null ? 'Unmeasured' : `${round(score)}%`]
    ]
  }
}

function ocrSignal(analysis = {}) {
  const metadata = analysis.metadata || {}
  const fields = extractSubjectFields(analysis)
  const extracted = Object.values(fields).filter(Boolean).length
  const hasText = Boolean(String(metadata.extracted_text || '').trim())
  const error = metadata.ocr_error || metadata.error
  const score = error ? 35 : hasText ? clamp(40 + extracted * 15) : null
  return {
    id: 'ocr',
    label: 'OCR',
    color: '#0f9f91',
    score,
    status: statusFromScore(score),
    source: 'OCR extraction',
    detail: error || (hasText ? `${extracted} structured identity field(s) extracted.` : 'No readable OCR text was extracted.'),
    trace: [
      ['Structured fields', String(extracted)],
      ['Raw OCR text', hasText ? 'Available' : 'Not available'],
      ['OCR issue', error || 'None recorded']
    ]
  }
}

function mrzSignal(session = {}) {
  const analysis = session.documentAnalysis || {}
  const mrz = analysis.mrz
  const applicable = normalizeDocumentType(session.documentType) === 'PASSPORT' || Boolean(mrz)
  if (!applicable) {
    return {
      id: 'mrz',
      label: 'MRZ',
      color: '#7c3aed',
      score: null,
      status: 'NOT_APPLICABLE',
      source: 'MRZ parser',
      detail: 'MRZ is not applicable for this document type.',
      applicable: false,
      trace: [['Applicability', 'Not applicable']]
    }
  }
  const score = !mrz ? null : !mrz.detected ? 20 : mrz.status === 'valid' ? 100 : mrz.status === 'uncertain' ? 58 : 32
  return {
    id: 'mrz',
    label: 'MRZ',
    color: '#7c3aed',
    score,
    status: !mrz ? 'UNMEASURED' : mrz.detected ? statusFromScore(score) : 'FAIL',
    source: 'MRZ parser',
    detail: !mrz ? 'MRZ result was not recorded.' : mrz.detected ? `${mrz.format || 'MRZ'} status: ${mrz.status}.` : 'No MRZ was found in the OCR text.',
    applicable: true,
    trace: [
      ['Detected', mrz?.detected ? 'Yes' : 'No'],
      ['Format', mrz?.format || 'Unknown'],
      ['Issues', mrz?.issues?.length ? mrz.issues.join(', ') : 'None recorded']
    ]
  }
}

function forensicSignal(analysis = {}) {
  const forensic = analysis.forensics || {}
  if (!forensic.status || forensic.status === 'NOT_RUN') {
    return {
      id: 'forensic',
      label: 'Forensic',
      color: '#e11d48',
      score: null,
      status: 'UNMEASURED',
      source: 'Forensic detector',
      detail: forensic.detail || 'A tampering detector is not connected to this processing service.',
      trace: [['Provider status', forensic.status || 'Not run']]
    }
  }
  const normalized = String(forensic.status).toUpperCase()
  const score = ['PASS', 'SAFE', 'CLEAR'].includes(normalized) ? 95 : ['WARN', 'REVIEW', 'SUSPICIOUS'].includes(normalized) ? 55 : 18
  return {
    id: 'forensic',
    label: 'Forensic',
    color: '#e11d48',
    score,
    status: statusFromScore(score),
    source: 'Forensic detector',
    detail: forensic.detail || `Forensic detector status: ${forensic.status}.`,
    trace: [['Provider status', forensic.status]]
  }
}

function biometricSignal(session = {}) {
  const face = session.faceVerification || {}
  const providerUnavailable = face.status === 'NOT_RUN' || face.provider === 'unavailable'
  const hasScore = Number.isFinite(Number(session.faceMatch)) && !providerUnavailable
  const score = hasScore ? clamp(Number(session.faceMatch)) : null
  return {
    id: 'biometric',
    label: 'Face similarity score',
    color: '#059669',
    score,
    status: statusFromScore(score),
    source: face.provider === 'aws-rekognition' ? 'AWS Rekognition' : face.provider || 'Face comparison',
    detail: providerUnavailable
      ? (face.label || face.error || 'Face comparison service did not return a usable score.')
      : `Document portrait and live capture similarity: ${round(score)}%.`,
    trace: [
      ['Provider', face.provider === 'aws-rekognition' ? 'AWS Rekognition' : face.provider || 'Not recorded'],
      ['Service status', face.status || 'Not recorded'],
      ['Document face crop', session.documentFaceBase64 ? 'Available' : 'Not available'],
      ['Live capture', session.liveFaceBase64 ? 'Available' : 'Not available']
    ]
  }
}

function csiiSignal(session = {}) {
  const csii = session.csiiResult || session.processingResult?.csii || null
  const score = csii?.signal_score == null ? null : clamp(Number(csii.signal_score) * 100)
  return {
    id: 'csii',
    label: 'CSII',
    color: '#d97706',
    score,
    status: !csii ? 'UNMEASURED' : csii.status === 'CLEAR' ? 'PASS' : 'REVIEW',
    source: 'Synthetic CSII demo',
    detail: csii
      ? `${csii.anomalies?.length || 0} synthetic correlation alert(s). Excluded from real confidence scoring.`
      : 'No CSII correlation result has been recorded for this session.',
    mock: true,
    trace: [
      ['Mode', csii?.mode || 'Not run'],
      ['Scenario', csii?.scenario || 'Not selected'],
      ['Composite inclusion', 'Excluded']
    ]
  }
}

function buildOverall(signals) {
  let weighted = 0
  let weights = 0
  for (const signal of signals) {
    if (signal.mock || signal.score == null || signal.status === 'NOT_APPLICABLE') continue
    const weight = SIGNAL_WEIGHTS[signal.id] || 0
    if (!weight) continue
    weighted += signal.score * weight
    weights += weight
  }
  if (!weights) return { score: null, normalized: null, tone: 'muted', label: 'Unmeasured' }
  const score = weighted / weights
  return {
    score: round(score),
    normalized: round(score / 100, 3),
    tone: toneFromScore(score),
    label: score >= 80 ? 'Ready to pass' : score >= 45 ? 'Needs review' : 'Critical review'
  }
}

function extractedFields(session = {}) {
  const analysis = session.documentAnalysis || {}
  const fields = extractSubjectFields(analysis)
  const metadata = analysis.metadata || {}
  const mrz = analysis.mrz?.parsed || {}
  return {
    fullName: fields.name || session.subjectNameMasked || '',
    maskedName: fields.name ? maskName(fields.name) : session.subjectNameMasked || 'Not extracted',
    documentType: documentTypeLabel(session.documentType),
    documentNumber: fields.documentNumber || session.documentNumberMasked || '',
    maskedDocumentNumber: fields.documentNumber ? maskDocumentNumber(fields.documentNumber) : session.documentNumberMasked || 'Not extracted',
    nationality: fields.nationality || session.subjectNationality || 'Not extracted',
    dob: fields.dob || session.subjectDobMasked || '',
    maskedDob: fields.dob ? maskDob(fields.dob) : session.subjectDobMasked || 'Not extracted',
    expiry: metadata.expiration_date || metadata.expiry_date || mrz.expiry_date || '',
    gender: metadata.sex || metadata.gender || mrz.sex || '',
    rawOcrText: metadata.extracted_text || ''
  }
}

function maskMrzLine(line) {
  const value = String(line || '')
  if (value.length <= 12) return value.replace(/[A-Z0-9]/g, '*')
  return `${value.slice(0, 6)}${'*'.repeat(Math.max(6, value.length - 12))}${value.slice(-6)}`
}

export function buildPipeline(signals) {
  return signals.map(signal => ({
    stage: signal.id === 'classification' ? 'CLASSIFICATION' : signal.id.toUpperCase(),
    status: signal.status === 'PASS' ? 'PASS' : signal.status === 'NOT_APPLICABLE' ? 'SKIPPED' : signal.status === 'UNMEASURED' ? 'NOT_RUN' : 'WARN',
    confidence: signal.score == null ? undefined : round(signal.score),
    detail: signal.detail
  }))
}

export function buildVerificationModel(session = {}) {
  const signals = [
    classifierSignal(session.documentAnalysis),
    ocrSignal(session.documentAnalysis),
    mrzSignal(session),
    forensicSignal(session.documentAnalysis),
    biometricSignal(session),
    csiiSignal(session)
  ]
  const fields = extractedFields(session)
  const mrz = session.documentAnalysis?.mrz || null
  const overall = buildOverall(signals)
  return {
    session,
    fields,
    signals,
    pipeline: buildPipeline(signals),
    overall,
    risk: {
      score: Number(session.riskScore || 0),
      level: session.riskLevel || 'MEDIUM',
      advisoryStatus: session.advisoryStatus || session.status || 'MANUAL_REVIEW'
    },
    face: {
      similarity: Number.isFinite(Number(session.faceMatch)) && session.faceVerification?.status !== 'NOT_RUN' && session.faceVerification?.provider !== 'unavailable' ? Number(session.faceMatch) : null,
      documentFaceBase64: session.documentFaceBase64 || session.faceVerification?.documentFaceBase64 || '',
      liveFaceBase64: session.liveFaceBase64 || '',
      provider: session.faceVerification?.provider === 'aws-rekognition' ? 'AWS Rekognition' : session.faceVerification?.provider || 'Face comparison',
      status: session.faceVerification?.status || 'NOT_RUN',
      globalOnly: true
    },
    documentPreviewBase64: session.documentFrontBase64 || '',
    documentBackBase64: session.documentBackBase64 || '',
    mrz: mrz ? {
      applicable: true,
      detected: Boolean(mrz.detected),
      status: mrz.status || 'unknown',
      format: mrz.format || 'Unknown',
      issues: mrz.issues || [],
      lines: (mrz.lines || []).map(maskMrzLine),
      parsed: mrz.parsed || {},
      checkDigits: mrz.check_digits || {},
      consistencyKnown: Boolean(mrz.ocr_consistency?.mismatch_fields?.length || mrz.ocr_consistency?.visible_to_mrz_match === false),
      ocrConsistency: mrz.ocr_consistency || null
    } : {
      applicable: normalizeDocumentType(session.documentType) === 'PASSPORT',
      detected: false,
      status: 'not_found',
      format: 'Unknown',
      issues: [],
      lines: [],
      parsed: {},
      checkDigits: {},
      consistencyKnown: false,
      ocrConsistency: null
    },
    csii: session.csiiResult || session.processingResult?.csii || null,
    sessionId: session.id,
    createdAt: session.createdAt,
    status: session.status || 'MANUAL_REVIEW'
  }
}

export function buildSavedSession(uploadSession = {}) {
  const result = {
    riskLevel: 'MEDIUM',
    riskScore: 0.5,
    status: 'MANUAL_REVIEW',
    faceMatch: 0,
    documentConfidence: 0,
    anomalies: [],
    ...(uploadSession.processingResult || {})
  }
  const fields = extractSubjectFields(uploadSession.documentAnalysis)
  const score = Number(result.faceMatch || 0)
  const officerName = uploadSession.officerEmail?.split('@')[0]?.replace(/[._]/g, ' ') || 'Officer'
  const provider = result.faceVerification?.provider === 'aws-rekognition'
    ? 'AWS Rekognition'
    : result.faceVerification?.provider === 'unavailable' ? 'Face service unavailable' : 'Face comparison'
  const baseSession = {
    subjectNameMasked: fields.name ? maskName(fields.name) : 'Not extracted',
    subjectNationality: fields.nationality || uploadSession.documentCountry?.iso3 || 'UNKNOWN',
    subjectDobMasked: fields.dob ? maskDob(fields.dob) : 'Not extracted',
    faceHash: createFaceEvidenceReference(),
    faceReferenceType: 'SESSION_EVIDENCE_REFERENCE',
    documentType: normalizeDocumentType(uploadSession.documentType),
    documentNumberMasked: fields.documentNumber ? maskDocumentNumber(fields.documentNumber) : 'Not extracted',
    documentCountry: uploadSession.documentCountry?.iso3 || 'UNKNOWN',
    documentAnalysis: uploadSession.documentAnalysis,
    documentFrontBase64: uploadSession.documentFrontBase64 || '',
    documentBackBase64: uploadSession.documentBackBase64 || '',
    faceMatch: score,
    documentConfidence: Number(result.documentConfidence ?? 0),
    faceVerification: result.faceVerification,
    sentinelCase: result.faceVerification?.sentinel,
    faceObservations: result.verificationObservations || [],
    documentFaceBase64: result.documentFaceBase64 || result.faceVerification?.documentFaceBase64 || '',
    liveFaceBase64: uploadSession.liveFaceBase64 || '',
    status: 'MANUAL_REVIEW',
    advisoryStatus: result.status || 'MANUAL_REVIEW',
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    officerId: uploadSession.officerId,
    officerName: officerName.replace(/\b\w/g, char => char.toUpperCase()),
    checkpointId: uploadSession.checkpointId || '',
    checkpointName: uploadSession.checkpointName || 'Unassigned checkpoint',
    checkpointStateCode: uploadSession.checkpointStateCode || '',
    csiiStatus: 'PENDING',
    csiiAnomalyCount: result.anomalies?.length || 0,
    csiiAnomalies: result.anomalies || [],
    processingResult: result,
    notes: `Created by the upload wizard. Document confidence: ${Number(result.documentConfidence ?? 0).toFixed(1)}%. Face match: ${score.toFixed(1)}% via ${provider}. Awaiting officer decision.`
  }
  return { ...baseSession, pipeline: buildVerificationModel(baseSession).pipeline }
}

export function buildDecisionRecord(session, decision, { reason = '', notes = '', actor, now = new Date().toISOString() } = {}) {
  if (!session) throw new Error('Session was not found.')
  const decisionMap = {
    pass: { status: 'VERIFIED', type: 'session.verified', label: 'passed' },
    flag: { status: 'MANUAL_REVIEW', type: 'session.flagged', label: 'flagged' },
    reject: { status: 'REJECTED', type: 'session.rejected', label: 'rejected' }
  }
  const next = decisionMap[decision]
  if (!next) throw new Error('Unsupported verification decision.')
  const patch = {
    status: next.status,
    officerDecision: decision.toUpperCase(),
    decisionReason: reason,
    decisionNotes: notes.trim(),
    decisionedAt: now,
    decisionedBy: actor?.id || session.officerId || 'unknown'
  }
  return {
    patch,
    auditEvent: {
      type: next.type,
      actorId: actor?.id || session.officerId || 'unknown',
      targetId: session.id,
      message: `${actor?.fullName || session.officerName || 'Officer'} ${next.label} ${session.id}${reason ? ` (${reason})` : ''}`,
      metadata: { sessionId: session.id, decision, reason, notes: notes.trim() }
    }
  }
}
