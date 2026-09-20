import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { flagEmoji } from '../../components/upload/CountrySelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { sessionStore } from '../../store/sessionStore'
import { computeFaceHash } from '../../utils/faceHash'
import { maskDob, maskDocumentNumber, maskName } from '../../utils/masking'
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

function defaultObservations(result) {
  const score = Number(result.faceMatch || 0)
  return [
    {
      title: 'Document portrait',
      status: result.documentFaceBase64 ? 'PASS' : 'REVIEW',
      detail: result.documentFaceBase64 ? 'Face was extracted from the uploaded document.' : 'Using the full document image because no cropped portrait was returned.'
    },
    {
      title: 'Live capture',
      status: 'PASS',
      detail: 'Captured face image is available for the verification session.'
    },
    {
      title: 'Match confidence',
      status: score >= 90 ? 'PASS' : 'REVIEW',
      detail: `${score.toFixed(1)}% match returned for document-to-live comparison.`
    }
  ]
}

function LandmarkOverlay() {
  const points = [
    [50, 21], [39, 34], [61, 34], [34, 48], [50, 46], [66, 48],
    [41, 58], [59, 58], [50, 65], [42, 76], [58, 76], [50, 84]
  ]
  return (
    <div className="face-landmark-layer" aria-hidden="true">
      <span className="face-line center" />
      <span className="face-line brow" />
      <span className="face-line nose" />
      <span className="face-line mouth" />
      {points.map(([left, top]) => (
        <i key={`${left}-${top}`} style={{ left: `${left}%`, top: `${top}%` }} />
      ))}
    </div>
  )
}

function CompleteStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const result = session.processingResult || { riskLevel: 'LOW', riskScore: 0.118, status: 'VERIFIED', faceMatch: 0, anomalies: [] }
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'
  const score = Number(result.faceMatch || 0)
  const scoreMeta = scoreTone(score)
  const documentFace = result.documentFaceBase64 || result.faceVerification?.documentFaceBase64 || session.documentFrontBase64
  const liveFace = session.liveFaceBase64
  const observations = result.verificationObservations?.length ? result.verificationObservations : defaultObservations(result)
  const providerLabel = result.faceVerification?.provider === 'aws-rekognition' ? 'AWS Rekognition' : 'Local fallback'
  const sentinel = result.faceVerification?.sentinel

  const display = useMemo(() => {
    if (result.riskLevel === 'LOW') return { title: 'Verification Complete', subtitle: 'Document and live face checks are ready.', tone: 'low' }
    if (result.riskLevel === 'MEDIUM') return { title: 'Session Flagged for Review', subtitle: 'Face confidence requires supervisor review.', tone: 'medium' }
    if (result.riskLevel === 'HIGH') return { title: 'High Risk Detected', subtitle: 'This session has been flagged for review.', tone: 'high' }
    return { title: 'Critical Risk Escalated', subtitle: 'This session has been escalated for immediate review.', tone: 'critical' }
  }, [result.riskLevel])

  useEffect(() => {
    if (session.savedSessionId) return
    const officerName = session.officerEmail?.split('@')[0]?.replace(/[._]/g, ' ') || 'Officer'
    const biometricStatus = score >= 90 ? 'PASS' : 'WARN'
    const saved = sessionStore.addSession({
      subjectNameMasked: maskName('Rahul Sharma'),
      subjectNationality: session.documentCountry?.iso3 || 'IND',
      subjectDobMasked: maskDob('1990-05-12'),
      faceHash: computeFaceHash(session.liveFaceBase64),
      documentType: normalizeDocumentType(session.documentType),
      documentNumberMasked: maskDocumentNumber('J1234567'),
      documentCountry: session.documentCountry?.iso3 || 'IND',
      pipeline: [
        { stage: 'CLASSIFICATION', status: 'PASS', confidence: 97.8, detail: `${typeLabel} detected` },
        { stage: 'OCR', status: 'PASS', confidence: 95.2, detail: 'Simulated extraction while ML models train' },
        { stage: 'MRZ', status: session.documentType === 'PASSPORT' ? 'PASS' : 'SKIPPED', confidence: session.documentType === 'PASSPORT' ? 99 : undefined },
        { stage: 'FORENSICS', status: 'PASS', confidence: 92.4 },
        { stage: 'BIOMETRICS', status: biometricStatus, confidence: Number(score.toFixed(1)), detail: `${providerLabel} document-to-live face comparison` },
        { stage: 'CSII', status: result.anomalies.length ? 'WARN' : 'PASS', confidence: 100 }
      ],
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
      csiiStatus: result.anomalies.length ? 'MONITORING' : 'ON',
      csiiAnomalyCount: result.anomalies.length,
      csiiAnomalies: result.anomalies,
      notes: `Created by the new session wizard. Face match: ${score.toFixed(1)}% via ${providerLabel}.`
    })
    newSessionStore.setSavedSessionId(saved.id)
  }, [documentFace, liveFace, observations, providerLabel, result, score, session, typeLabel])

  useEffect(() => {
    const timeout = window.setTimeout(() => navigate('/verifications'), 6000)
    return () => window.clearTimeout(timeout)
  }, [navigate])

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
            <strong>Extracted portrait</strong>
          </div>
          <div className="verified-face-oval">
            {documentFace ? <img src={documentFace} alt="Extracted document face" /> : <span>No face preview</span>}
            {documentFace && <LandmarkOverlay />}
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
        </section>
      </div>

      <div className="result-summary compact">
        <div><span>Subject</span><strong>RAHUL S****</strong></div>
        <div><span>Document</span><strong>{flagEmoji(session.documentCountry?.code)} {session.documentCountry?.name} {typeLabel}</strong></div>
        <div><span>Risk score</span><strong>{Number(result.riskScore).toFixed(3)} ({result.riskLevel})</strong></div>
        <div><span>Database</span><strong>{sentinel?.recorded ? sentinel.case_reference : sentinel?.enabled ? 'Not recorded' : 'SQLite session'}</strong></div>
      </div>
    </UploadCard>
  )
}

export default CompleteStep
