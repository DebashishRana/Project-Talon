import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Network, ShieldX, UserRoundCheck, X } from 'lucide-react'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { flagEmoji } from '../../components/upload/CountrySelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { sessionStore } from '../../store/sessionStore'
import { maskDob, maskDocumentNumber, maskName } from '../../utils/masking'
import { subjectFields } from '../../utils/documentAnalysis'
import { analyzeCsii } from '../../utils/csii'
import DocumentEvidence from './DocumentEvidence'
import CSIIGraphDialog from './CSIIGraphDialog'
import { UploadCard } from './UploadRouter'
import './CompleteStep.css'

function normalizeDocumentType(type) {
  if (type === 'VISA') return 'VISA'
  if (type === 'AADHAAR_PAN') return 'AADHAAR'
  if (type === 'NATIONAL_ID') return 'PERMIT'
  return 'PASSPORT'
}

function createFaceEvidenceReference() {
  const identifier = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return `FACE-REF-${identifier.slice(0, 8).toUpperCase()}`
}

function scoreTone(score) {
  if (score >= 95) return { label: 'Strong', tone: 'low' }
  if (score >= 90) return { label: 'Good', tone: 'low' }
  if (score >= 75) return { label: 'Review', tone: 'medium' }
  return { label: 'Low', tone: 'critical' }
}

function documentConfidenceMeta(score) {
  if (score < 60) return { label: 'Tampered / unsafe', tone: 'critical', decision: 'tampered / unsafe' }
  if (score < 75) return { label: 'Suspicious', tone: 'medium', decision: 'suspicious' }
  if (score > 80) return { label: 'Safe', tone: 'low', decision: 'safe' }
  return { label: 'Review', tone: 'medium', decision: 'requires review' }
}

function pipelineFromEvidence(session, result, score, providerLabel) {
  const analysis = session.documentAnalysis || {}
  const classifier = analysis.classifier || {}
  const ocrText = analysis.metadata?.extracted_text || ''
  const mrz = analysis.mrz
  const classifierPass = Boolean(classifier.expected_document)
  const biometricStatus = result.faceVerification?.status === 'NOT_RUN' ? 'WARN' : score >= 90 ? 'PASS' : 'WARN'

  const csii = result.csii
  const csiiStatus = !csii ? 'PENDING' : csii.status === 'CLEAR' ? 'PASS' : 'WARN'
  return [
    {
      stage: 'CLASSIFICATION',
      status: classifierPass ? 'PASS' : 'WARN',
      confidence: classifier.confidence ? Number((classifier.confidence * 100).toFixed(1)) : undefined,
      detail: `${classifier.document_type || 'Unknown'} classifier result`
    },
    {
      stage: 'OCR',
      status: ocrText.trim() ? 'PASS' : 'WARN',
      detail: ocrText.trim() ? 'OCR text extracted from uploaded document files' : 'No readable OCR text was extracted'
    },
    {
      stage: 'MRZ',
      status: session.documentType === 'PASSPORT' ? (mrz?.detected && mrz.status === 'valid' ? 'PASS' : 'WARN') : 'SKIPPED',
      detail: session.documentType === 'PASSPORT' ? (mrz?.detected ? `MRZ status: ${mrz.status}` : 'MRZ not found') : 'MRZ not required'
    },
    { stage: 'BIOMETRICS', status: biometricStatus, confidence: Number(score.toFixed(1)), detail: providerLabel },
    {
      stage: 'CSII',
      status: csiiStatus,
      confidence: csii ? Number((Number(csii.signal_score || 0) * 100).toFixed(0)) : undefined,
      detail: csii ? `${csii.anomalies?.length || 0} synthetic correlation alert(s) recorded` : 'Synthetic correlation graph is being prepared'
    }
  ]
}

function fallbackObservations(result) {
  const score = Number(result.faceMatch || 0)
  return [
    {
      title: 'Document portrait',
      status: result.documentFaceBase64 ? 'PASS' : 'REVIEW',
      detail: result.documentFaceBase64 ? 'Face was extracted from the uploaded document.' : 'No cropped document portrait was returned.'
    },
    {
      title: 'Live capture',
      status: result.faceVerification?.status === 'NOT_RUN' ? 'REVIEW' : 'PASS',
      detail: result.faceVerification?.status === 'NOT_RUN' ? 'Face comparison service did not return a score.' : 'Captured face image is available for this session.'
    },
    {
      title: 'Match confidence',
      status: score >= 90 ? 'PASS' : 'REVIEW',
      detail: `${score.toFixed(1)}% match returned for document-to-live comparison.`
    }
  ]
}

function CompleteStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const savedRef = useRef(false)
  const csiiRunRef = useRef(false)
  const [isDeclineOpen, setIsDeclineOpen] = useState(false)
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declineNote, setDeclineNote] = useState('')
  const [approvalNote, setApprovalNote] = useState('')
  const [isCsiiOpen, setIsCsiiOpen] = useState(false)
  const [csiiLoading, setCsiiLoading] = useState(false)
  const [csiiError, setCsiiError] = useState('')
  const result = {
    riskLevel: 'MEDIUM',
    riskScore: 0.5,
    status: 'MANUAL_REVIEW',
    faceMatch: 0,
    documentConfidence: 0,
    anomalies: [],
    ...(session.processingResult || {})
  }
  const fields = subjectFields(session.documentAnalysis)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'
  const score = Number(result.faceMatch || 0)
  const scoreMeta = scoreTone(score)
  const documentConfidence = Number(result.documentConfidence ?? 0)
  const documentConfidenceState = documentConfidenceMeta(documentConfidence)
  const documentFace = result.documentFaceBase64 || result.faceVerification?.documentFaceBase64
  const liveFace = session.liveFaceBase64
  const observations = result.verificationObservations?.length ? result.verificationObservations : fallbackObservations(result)
  const providerLabel = result.faceVerification?.provider === 'aws-rekognition'
    ? 'AWS Rekognition'
    : result.faceVerification?.provider === 'unavailable' ? 'Face service unavailable' : 'Face comparison'
  const sentinel = result.faceVerification?.sentinel
  const csiiResult = result.csii || null

  const display = useMemo(() => {
    if (result.status === 'REJECTED') return { title: 'Session Declined', subtitle: 'The officer decision and reason were recorded.', tone: 'critical' }
    if (result.riskLevel === 'LOW') return { title: 'Verification Complete', subtitle: 'Document and face checks are ready.', tone: 'low' }
    if (result.riskLevel === 'MEDIUM') return { title: 'Session Flagged for Review', subtitle: 'One or more checks need officer review.', tone: 'medium' }
    if (result.riskLevel === 'HIGH') return { title: 'High Risk Detected', subtitle: 'Multiple checks need supervisor review.', tone: 'high' }
    return { title: 'Critical Risk Escalated', subtitle: 'This session has been escalated for immediate review.', tone: 'critical' }
  }, [result.riskLevel, result.status])

  useEffect(() => {
    if (session.savedSessionId || savedRef.current) return
    savedRef.current = true
    const officerName = session.officerEmail?.split('@')[0]?.replace(/[._]/g, ' ') || 'Officer'
    const saved = sessionStore.addSession({
      subjectNameMasked: maskName(fields.name),
      subjectNationality: fields.nationality || session.documentCountry?.iso3 || 'UNKNOWN',
      subjectDobMasked: fields.dob ? maskDob(fields.dob) : 'Not extracted',
      // This is an opaque session evidence reference, not a biometric face hash.
      faceHash: createFaceEvidenceReference(),
      faceReferenceType: 'SESSION_EVIDENCE_REFERENCE',
      documentType: normalizeDocumentType(session.documentType),
      documentNumberMasked: fields.documentNumber ? maskDocumentNumber(fields.documentNumber) : 'Not extracted',
      documentCountry: session.documentCountry?.iso3 || 'UNKNOWN',
      documentAnalysis: session.documentAnalysis,
      pipeline: pipelineFromEvidence(session, result, score, providerLabel),
      faceMatch: score,
      documentConfidence,
      faceVerification: result.faceVerification,
      sentinelCase: sentinel,
      faceObservations: observations,
      documentFaceBase64: documentFace,
      liveFaceBase64: liveFace,
      status: result.status,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      officerId: session.officerId,
      officerName: officerName.replace(/\b\w/g, char => char.toUpperCase()),
      checkpointId: session.checkpointId || '',
      checkpointName: session.checkpointName || 'Unassigned checkpoint',
      checkpointStateCode: session.checkpointStateCode || '',
      csiiStatus: 'PENDING',
      csiiAnomalyCount: result.anomalies.length,
      csiiAnomalies: result.anomalies,
      notes: `Created by the upload wizard. Document screening confidence: ${documentConfidence.toFixed(1)}%. Face match: ${score.toFixed(1)}% via ${providerLabel}.`
    })
    newSessionStore.setSavedSessionId(saved.id)
  }, [documentFace, fields, liveFace, observations, providerLabel, result, score, sentinel, session])

  const runCsii = async (scenario = csiiResult?.scenario || 'travel_alert') => {
    setCsiiLoading(true)
    setCsiiError('')
    try {
      const csii = await analyzeCsii({ fields, documentType: session.documentType, scenario })
      const updatedResult = { ...result, csii }
      newSessionStore.setProcessingResult(updatedResult)
      if (session.savedSessionId) {
        sessionStore.updateSession(session.savedSessionId, {
          csiiResult: csii,
          csiiStatus: csii.status === 'CLEAR' ? 'ON' : 'MONITORING',
          csiiAnomalyCount: csii.anomalies?.length || 0,
          csiiAnomalies: (csii.anomalies || []).map(item => item.type),
          pipeline: pipelineFromEvidence(session, updatedResult, score, providerLabel),
        })
      }
    } catch (error) {
      setCsiiError(error.message || 'CSII analysis could not be completed.')
    } finally {
      setCsiiLoading(false)
    }
  }

  useEffect(() => {
    if (!session.savedSessionId || csiiResult || csiiLoading || csiiError || csiiRunRef.current) return
    csiiRunRef.current = true
    runCsii('travel_alert')
  }, [session.savedSessionId])

  const startAnother = () => {
    newSessionStore.reset()
    navigate('/upload/authorize')
  }

  const declineSession = () => {
    if (!declineReason) return
    const anomalies = Array.from(new Set([...(result.anomalies || []), 'SESSION_DECLINED']))
    const declinedResult = {
      ...result,
      status: 'REJECTED',
      riskLevel: 'HIGH',
      riskScore: Math.max(Number(result.riskScore || 0), 0.75),
      anomalies,
      declineReason,
      declineNote: declineNote.trim()
    }
    const note = `Declined: ${declineReason}${declineNote.trim() ? `. ${declineNote.trim()}` : ''}`

    newSessionStore.setProcessingResult(declinedResult)
    if (session.savedSessionId) {
      sessionStore.updateSession(session.savedSessionId, {
        status: 'REJECTED',
        riskLevel: 'HIGH',
        riskScore: declinedResult.riskScore,
        csiiAnomalyCount: anomalies.length,
        csiiAnomalies: anomalies,
        declineReason,
        declineNote: declineNote.trim(),
        notes: note
      })
    }
    setIsDeclineOpen(false)
  }

  const moveToHumanVerification = () => {
    const anomalies = Array.from(new Set([...(result.anomalies || []), 'HUMAN_VERIFICATION_REQUESTED']))
    const humanReviewResult = {
      ...result,
      status: 'MANUAL_REVIEW',
      riskLevel: result.riskLevel === 'LOW' ? 'MEDIUM' : result.riskLevel,
      anomalies,
      humanVerificationRequested: true
    }
    newSessionStore.setProcessingResult(humanReviewResult)
    if (session.savedSessionId) {
      sessionStore.updateSession(session.savedSessionId, {
        status: 'MANUAL_REVIEW',
        riskLevel: humanReviewResult.riskLevel,
        csiiAnomalyCount: anomalies.length,
        csiiAnomalies: anomalies,
        humanVerificationRequested: true,
        notes: 'Moved to human verification for officer review.'
      })
    }
  }

  const recordApproval = ({ note, isOverride }) => {
    const approvalResult = {
      ...result,
      status: 'VERIFIED',
      riskLevel: 'LOW',
      approvedByOfficer: true,
      approvalOverrideReason: isOverride ? note : undefined,
      approvalMethod: isOverride ? 'OFFICER_OVERRIDE' : 'CONFIDENCE_THRESHOLD'
    }
    newSessionStore.setProcessingResult(approvalResult)
    if (session.savedSessionId) {
      sessionStore.updateSession(session.savedSessionId, {
        status: 'VERIFIED',
        riskLevel: 'LOW',
        approvalOverrideReason: isOverride ? note : undefined,
        approvedByOfficer: true,
        approvalMethod: approvalResult.approvalMethod,
        notes: isOverride
          ? `Officer approved this document as valid. Explanation: ${note}`
          : `Approved as valid at ${documentConfidence.toFixed(1)}% document screening confidence.`
      })
    }
  }

  const approveDocument = () => {
    if (approvalNote.trim().length < 15) return
    recordApproval({ note: approvalNote.trim(), isOverride: true })
    setIsApprovalOpen(false)
    setApprovalNote('')
  }

  const acceptDocument = () => {
    if (documentConfidence < 75) {
      setIsApprovalOpen(true)
      return
    }
    recordApproval({ note: '', isOverride: false })
  }

  const showDeclineAction = display.title === 'Session Flagged for Review' && result.status !== 'REJECTED'
  const openCsiiGraph = () => {
    setIsCsiiOpen(true)
    if (!csiiResult && !csiiLoading) runCsii('travel_alert')
  }

  return (
    <UploadCard
      step={step}
      title={display.title}
      subtitle={display.subtitle}
      className="upload-card-wide"
      headerAction={<div className="result-header-actions">
        <button className="csii-graph-button" type="button" onClick={openCsiiGraph} disabled={csiiLoading}>
          <Network size={17} /> {csiiLoading ? 'Building CSII graph' : 'Open CSII graph'}
        </button>
        {showDeclineAction && <button className="decline-session-button" type="button" onClick={() => setIsDeclineOpen(true)}>
          <img src="/icons/danger-file.svg" alt="" /> Decline session
        </button>}
      </div>}
      footer={<>
        <button className="upload-secondary" type="button" onClick={startAnother}>Start Another Session</button>
        <button className="upload-primary" type="button" onClick={() => navigate(session.savedSessionId ? `/verifications/${session.savedSessionId}` : '/verifications')}>View Session Details</button>
        <button className="human-verification-button" type="button" onClick={moveToHumanVerification} disabled={result.status === 'REJECTED'}><UserRoundCheck size={17} /> Move to Human Verification</button>
        <button className="accept-document-button" type="button" onClick={acceptDocument} disabled={result.status === 'REJECTED'}><Check size={17} /> Accept as Valid</button>
      </>}
    >
      <div className="face-result-layout">
        <section className="face-preview-panel">
          <div className="face-panel-title">
            <span>Document Face</span>
            <strong>{documentFace ? 'Extracted portrait' : 'Not available'}</strong>
          </div>
          <div className="verified-face-oval">
            {documentFace ? <img src={documentFace} alt="Extracted document face" /> : <span>No face preview</span>}
          </div>
          <div className="live-capture-strip">
            {liveFace && <img src={liveFace} alt="Live face capture" />}
            <div>
              <span>Live Capture</span>
              <strong>{providerLabel}</strong>
            </div>
          </div>
        </section>

        <section className="match-analysis-panel">
          <div className="match-score-head">
            <div>
              <span>Document Screening Confidence</span>
              <strong>{documentConfidence.toFixed(1)}<small>/100</small></strong>
            </div>
            <em className={`match-badge ${documentConfidenceState.tone}`}>{documentConfidenceState.label}</em>
          </div>
          <div className="confidence-ruler" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, index) => (
              <i className={`${index < Math.round((documentConfidence / 100) * 36) ? 'active' : ''} ${documentConfidenceState.tone}`} key={index} />
            ))}
          </div>
          <div className="face-observation-list">
            {observations.map(item => (
              <article className={`face-observation ${String(item.status || '').toLowerCase()}`} key={item.title}>
                <span>{String(item.title || '').slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <DocumentEvidence analysis={session.documentAnalysis} />
        </section>
      </div>

      <div className="result-summary compact">
        <div><span>Subject</span><strong>{fields.name ? maskName(fields.name) : 'Not extracted'}</strong></div>
        <div><span>Document</span><strong>{flagEmoji(session.documentCountry?.code)} {session.documentCountry?.name} {typeLabel}</strong></div>
        <div><span>Document no.</span><strong>{fields.documentNumber ? maskDocumentNumber(fields.documentNumber) : 'Not extracted'}</strong></div>
        <div><span>Face match</span><strong>{score.toFixed(1)}% ({scoreMeta.label})</strong></div>
        <div><span>CSII</span><strong>{csiiLoading ? 'Building graph' : csiiResult?.status === 'CLEAR' ? 'Clear' : csiiResult ? `${csiiResult.anomalies?.length || 0} alert(s)` : 'Pending'}</strong></div>
        <div><span>Risk score</span><strong>{Number(result.riskScore).toFixed(3)} ({result.riskLevel})</strong></div>
        <div><span>Database</span><strong>{sentinel?.recorded ? sentinel.case_reference : sentinel?.enabled ? 'Not recorded' : 'Local session'}</strong></div>
      </div>
      {isDeclineOpen && (
        <div className="decline-modal-backdrop" role="presentation" onMouseDown={() => setIsDeclineOpen(false)}>
          <section className="decline-modal" role="dialog" aria-modal="true" aria-labelledby="decline-session-title" onMouseDown={event => event.stopPropagation()}>
            <header>
              <span>Decline session</span>
              <button type="button" aria-label="Close decline dialog" onClick={() => setIsDeclineOpen(false)}><X size={18} /></button>
            </header>
            <h2 id="decline-session-title">Add a reason for declining this session</h2>
            <fieldset>
              <legend>Select a reason for declining</legend>
              {[
                'Known fraud',
                'Live capture does not match the document portrait',
                'Suspected document tampering',
                'Suspicious behaviour',
                'Document does not match other submitted documents',
                'Other'
              ].map(reason => <label key={reason}><input type="radio" name="decline-reason" value={reason} checked={declineReason === reason} onChange={() => setDeclineReason(reason)} /><span>{reason}</span></label>)}
            </fieldset>
            <label className="decline-note" htmlFor="decline-note">Officer note<textarea id="decline-note" value={declineNote} onChange={event => setDeclineNote(event.target.value)} placeholder="Add a note for the session record" /></label>
            <footer><button type="button" className="decline-cancel" onClick={() => setIsDeclineOpen(false)}>Cancel</button><button type="button" className="decline-confirm" disabled={!declineReason} onClick={declineSession}><ShieldX size={16} /> Decline session</button></footer>
          </section>
        </div>
      )}
      {isApprovalOpen && (
        <div className="decline-modal-backdrop" role="presentation" onMouseDown={() => setIsApprovalOpen(false)}>
          <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approve-document-title" onMouseDown={event => event.stopPropagation()}>
            <header>
              <span>Approve document</span>
              <button type="button" aria-label="Close approval dialog" onClick={() => setIsApprovalOpen(false)}><X size={18} /></button>
            </header>
            <div className="approval-modal-content">
              <p>The document was marked as <strong>{documentConfidenceState.decision}</strong> at {documentConfidence.toFixed(1)}% screening confidence, yet you are passing it as valid.</p>
              <label className="approval-note" htmlFor="approval-note">Please provide a detailed explanation for this decision<textarea id="approval-note" value={approvalNote} onChange={event => setApprovalNote(event.target.value)} placeholder="Explain why this document can be accepted as valid" autoFocus /></label>
              <small className="approval-hint">A minimum of 15 characters is required for the audit record.</small>
            </div>
            <footer><button type="button" className="decline-cancel" onClick={() => setIsApprovalOpen(false)}>Cancel</button><button type="button" className="approve-confirm" disabled={approvalNote.trim().length < 15} onClick={approveDocument}><Check size={16} /> Approve document</button></footer>
          </section>
        </div>
      )}
      {isCsiiOpen && <CSIIGraphDialog result={csiiResult} loading={csiiLoading} error={csiiError} onClose={() => setIsCsiiOpen(false)} onScenarioChange={runCsii} />}
    </UploadCard>
  )
}

export default CompleteStep
