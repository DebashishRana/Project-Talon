import React, { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { flagEmoji } from '../../components/upload/CountrySelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { sessionStore } from '../../store/sessionStore'
import { computeFaceHash } from '../../utils/faceHash'
import { maskDob, maskDocumentNumber, maskName } from '../../utils/masking'
import { subjectFields } from '../../utils/documentAnalysis'
import DocumentEvidence from './DocumentEvidence'
import { UploadCard } from './UploadRouter'

function normalizeDocumentType(type) {
  if (type === 'VISA') return 'VISA'
  if (type === 'AADHAAR_PAN') return 'AADHAAR'
  if (type === 'NATIONAL_ID') return 'PERMIT'
  return 'PASSPORT'
}

function scoreTone(score) {
  if (score >= 95) return { label: 'Strong', tone: 'low' }
  if (score >= 90) return { label: 'Good', tone: 'low' }
  if (score >= 75) return { label: 'Review', tone: 'medium' }
  return { label: 'Low', tone: 'critical' }
}

function pipelineFromEvidence(session, result, score, providerLabel) {
  const analysis = session.documentAnalysis || {}
  const classifier = analysis.classifier || {}
  const ocrText = analysis.metadata?.extracted_text || ''
  const mrz = analysis.mrz
  const classifierPass = Boolean(classifier.expected_document)
  const biometricStatus = result.faceVerification?.status === 'NOT_RUN' ? 'WARN' : score >= 90 ? 'PASS' : 'WARN'

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
    { stage: 'FORENSICS', status: 'SKIPPED', detail: 'Tampering detector is not connected to this service yet' },
    { stage: 'BIOMETRICS', status: biometricStatus, confidence: Number(score.toFixed(1)), detail: providerLabel },
    { stage: 'CSII', status: 'SKIPPED', detail: 'Graph review available from session details' }
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
  const result = session.processingResult || { riskLevel: 'MEDIUM', riskScore: 0.5, status: 'MANUAL_REVIEW', faceMatch: 0, anomalies: [] }
  const fields = subjectFields(session.documentAnalysis)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'
  const score = Number(result.faceMatch || 0)
  const scoreMeta = scoreTone(score)
  const documentFace = result.documentFaceBase64 || result.faceVerification?.documentFaceBase64
  const liveFace = session.liveFaceBase64
  const observations = result.verificationObservations?.length ? result.verificationObservations : fallbackObservations(result)
  const providerLabel = result.faceVerification?.provider === 'aws-rekognition'
    ? 'AWS Rekognition'
    : result.faceVerification?.provider === 'unavailable' ? 'Face service unavailable' : 'Face comparison'
  const sentinel = result.faceVerification?.sentinel

  const display = useMemo(() => {
    if (result.riskLevel === 'LOW') return { title: 'Verification Complete', subtitle: 'Document and face checks are ready.', tone: 'low' }
    if (result.riskLevel === 'MEDIUM') return { title: 'Session Flagged for Review', subtitle: 'One or more checks need officer review.', tone: 'medium' }
    if (result.riskLevel === 'HIGH') return { title: 'High Risk Detected', subtitle: 'Multiple checks need supervisor review.', tone: 'high' }
    return { title: 'Critical Risk Escalated', subtitle: 'This session has been escalated for immediate review.', tone: 'critical' }
  }, [result.riskLevel])

  useEffect(() => {
    if (session.savedSessionId || savedRef.current) return
    savedRef.current = true
    const officerName = session.officerEmail?.split('@')[0]?.replace(/[._]/g, ' ') || 'Officer'
    const saved = sessionStore.addSession({
      subjectNameMasked: maskName(fields.name),
      subjectNationality: fields.nationality || session.documentCountry?.iso3 || 'UNKNOWN',
      subjectDobMasked: fields.dob ? maskDob(fields.dob) : 'Not extracted',
      faceHash: computeFaceHash(session.liveFaceBase64),
      documentType: normalizeDocumentType(session.documentType),
      documentNumberMasked: fields.documentNumber ? maskDocumentNumber(fields.documentNumber) : 'Not extracted',
      documentCountry: session.documentCountry?.iso3 || 'UNKNOWN',
      documentAnalysis: session.documentAnalysis,
      pipeline: pipelineFromEvidence(session, result, score, providerLabel),
      faceMatch: score,
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
      checkpointId: 'checkpoint-raxaul',
      checkpointName: 'Raxaul',
      csiiStatus: 'PENDING',
      csiiAnomalyCount: result.anomalies.length,
      csiiAnomalies: result.anomalies,
      notes: `Created by the upload wizard. Face match: ${score.toFixed(1)}% via ${providerLabel}.`
    })
    newSessionStore.setSavedSessionId(saved.id)
  }, [documentFace, fields, liveFace, observations, providerLabel, result, score, sentinel, session])

  const startAnother = () => {
    newSessionStore.reset()
    navigate('/upload/authorize')
  }

  return (
    <UploadCard
      step={step}
      title={display.title}
      subtitle={display.subtitle}
      className="upload-card-wide"
      footer={<>
        <button className="upload-secondary" type="button" onClick={startAnother}>Start Another Session</button>
        <button className="upload-primary" type="button" onClick={() => navigate('/verifications')}>View Session Details</button>
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
              <span>Face Match Confidence</span>
              <strong>{score.toFixed(1)}<small>/100</small></strong>
            </div>
            <em className={`match-badge ${scoreMeta.tone}`}>{scoreMeta.label}</em>
          </div>
          <div className="confidence-ruler" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, index) => (
              <i className={index < Math.round((score / 100) * 36) ? 'active' : ''} key={index} />
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
        <div><span>Risk score</span><strong>{Number(result.riskScore).toFixed(3)} ({result.riskLevel})</strong></div>
        <div><span>Database</span><strong>{sentinel?.recorded ? sentinel.case_reference : sentinel?.enabled ? 'Not recorded' : 'Local session'}</strong></div>
      </div>
    </UploadCard>
  )
}

export default CompleteStep
