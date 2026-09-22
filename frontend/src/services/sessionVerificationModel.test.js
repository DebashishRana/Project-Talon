import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDecisionRecord,
  buildSavedSession,
  buildVerificationModel,
  extractSubjectFields
} from './sessionVerificationModel.js'

const validMrz = {
  detected: true,
  status: 'valid',
  format: 'TD3',
  issues: [],
  lines: ['P<INDWHIRIGE<<MINT<<<<<<<<<<<<<<<<<<<<<<<<<<<', 'ZA2706582IND0703019F3501012<<<<<<<<<<<<<<02'],
  parsed: {
    given_names: 'MINT',
    surname: 'WHIRIGE',
    passport_number: 'ZA270658',
    nationality: 'IND',
    birth_date: '070301',
    sex: 'F',
    expiry_date: '350101'
  },
  check_digits: { passport_number: 2 },
  ocr_consistency: { visible_to_mrz_match: true, mismatch_fields: [] }
}

function passportSession(extra = {}) {
  return {
    id: 'TALON-TEST-001',
    documentType: 'PASSPORT',
    documentAnalysis: {
      metadata: {
        extracted_text: 'MINT WHIRIGE ZA270658 IND',
        holder_name: 'Mint Whirige',
        passport_number: 'ZA270658',
        nationality: 'IND',
        date_of_birth: '2007-03-01'
      },
      classifier: {
        confidence: 0.95,
        document_type: 'PASSPORT',
        expected_document: true
      },
      mrz: validMrz,
      forensics: { status: 'NOT_RUN' }
    },
    faceMatch: 92,
    faceVerification: { status: 'PASS', provider: 'aws-rekognition' },
    documentFaceBase64: 'data:image/png;base64,doc',
    liveFaceBase64: 'data:image/png;base64,live',
    riskScore: 0.72,
    riskLevel: 'HIGH',
    status: 'MANUAL_REVIEW',
    officerId: 'officer-1',
    officerName: 'Officer One',
    ...extra
  }
}

test('subject extraction matches OCR metadata before MRZ fallback', () => {
  const fields = extractSubjectFields(passportSession().documentAnalysis)
  assert.deepEqual(fields, {
    name: 'Mint Whirige',
    dob: '2007-03-01',
    documentNumber: 'ZA270658',
    nationality: 'IND'
  })
})

test('synthetic CSII is visible but excluded from real verification confidence', () => {
  const lowCsii = buildVerificationModel(passportSession({
    csiiResult: { mode: 'SYNTHETIC_DEMO', status: 'REVIEW', signal_score: 0.05, anomalies: [{ type: 'DOCUMENT_REUSE' }] }
  }))
  const highCsii = buildVerificationModel(passportSession({
    csiiResult: { mode: 'SYNTHETIC_DEMO', status: 'CLEAR', signal_score: 1, anomalies: [] }
  }))

  assert.equal(lowCsii.signals.find(signal => signal.id === 'csii').mock, true)
  assert.equal(lowCsii.overall.score, highCsii.overall.score)
  assert.equal(lowCsii.overall.label, 'Ready to pass')
})

test('unavailable face comparison remains unmeasured even when a legacy score exists', () => {
  const model = buildVerificationModel(passportSession({
    faceMatch: 99,
    faceVerification: { status: 'NOT_RUN', provider: 'unavailable', label: 'Face service unavailable' }
  }))
  const biometric = model.signals.find(signal => signal.id === 'biometric')

  assert.equal(model.face.similarity, null)
  assert.equal(biometric.score, null)
  assert.equal(biometric.status, 'UNMEASURED')
  assert.notEqual(model.overall.score, 99)
})

test('MRZ is not applicable for non-passport documents', () => {
  const model = buildVerificationModel(passportSession({ documentType: 'VISA', documentAnalysis: { metadata: { extracted_text: 'VISA RECORD' }, classifier: { confidence: 0.82 } } }))
  const mrz = model.signals.find(signal => signal.id === 'mrz')

  assert.equal(model.mrz.applicable, false)
  assert.equal(mrz.status, 'NOT_APPLICABLE')
})

test('upload save model keeps advisory result separate from officer decision', () => {
  const saved = buildSavedSession({
    officerId: 'officer-1',
    officerEmail: 'officer.one@ssb.gov.in',
    checkpointId: 'checkpoint-raxaul',
    checkpointName: 'Raxaul',
    documentType: 'PASSPORT',
    documentCountry: { iso3: 'IND' },
    documentAnalysis: passportSession().documentAnalysis,
    liveFaceBase64: 'data:image/png;base64,live',
    processingResult: { status: 'VERIFIED', riskLevel: 'LOW', riskScore: 0.12, faceMatch: 96, faceVerification: { status: 'PASS', provider: 'aws-rekognition' } }
  })

  assert.equal(saved.status, 'MANUAL_REVIEW')
  assert.equal(saved.advisoryStatus, 'VERIFIED')
  assert.equal(saved.checkpointName, 'Raxaul')
  assert.match(saved.notes, /Awaiting officer decision/)
})

test('manual pass decision does not overwrite risk evidence', () => {
  const { patch, auditEvent } = buildDecisionRecord(passportSession(), 'pass', {
    actor: { id: 'officer-2', fullName: 'Officer Two' },
    notes: 'Reviewed evidence and accepted.',
    now: '2026-09-22T10:00:00.000Z'
  })

  assert.equal(patch.status, 'VERIFIED')
  assert.equal(patch.decisionedBy, 'officer-2')
  assert.equal(patch.decisionNotes, 'Reviewed evidence and accepted.')
  assert.equal(Object.hasOwn(patch, 'riskScore'), false)
  assert.equal(Object.hasOwn(patch, 'riskLevel'), false)
  assert.equal(auditEvent.type, 'session.verified')
})
