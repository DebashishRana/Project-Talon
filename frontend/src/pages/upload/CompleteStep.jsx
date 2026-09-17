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

function CompleteStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const result = session.processingResult || { riskLevel: 'LOW', riskScore: 0.118, status: 'VERIFIED', faceMatch: 96.4, anomalies: [] }
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'

  const display = useMemo(() => {
    if (result.riskLevel === 'LOW') return { icon: '✓', title: 'Verification Complete', subtitle: 'All checks passed. Identity verified.', tone: 'low' }
    if (result.riskLevel === 'MEDIUM') return { icon: '!', title: 'Session Flagged for Review', subtitle: 'This session has been flagged. A supervisor will review it.', tone: 'medium' }
    if (result.riskLevel === 'HIGH') return { icon: '!', title: 'High Risk Detected', subtitle: 'This session has been flagged. A supervisor will review it.', tone: 'high' }
    return { icon: '×', title: 'Critical Risk - Escalated', subtitle: 'This session has been flagged. A supervisor will review it.', tone: 'critical' }
  }, [result.riskLevel])

  useEffect(() => {
    if (session.savedSessionId) return
    const officerName = session.officerEmail?.split('@')[0]?.replace(/[._]/g, ' ') || 'Officer'
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
        { stage: 'BIOMETRICS', status: 'PASS', confidence: Number(result.faceMatch?.toFixed?.(1) || 96.4) },
        { stage: 'CSII', status: result.anomalies.length ? 'WARN' : 'PASS', confidence: 100 }
      ],
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
      notes: 'Created by the new session wizard with simulated processing while ML models are under training.'
    })
    newSessionStore.setSavedSessionId(saved.id)
  }, [result, session, typeLabel])

  useEffect(() => {
    const timeout = window.setTimeout(() => navigate('/verifications'), 3000)
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
      footer={<>
        <button className="upload-secondary" type="button" onClick={startAnother}>Start Another Session</button>
        <button className="upload-primary" type="button" onClick={() => navigate('/verifications')}>View Session Details</button>
      </>}
    >
      <div className={`result-icon ${display.tone}`}>{display.icon}</div>
      <div className="result-summary">
        <div><span>Subject</span><strong>RAHUL S****</strong></div>
        <div><span>Document</span><strong>{flagEmoji(session.documentCountry?.code)} {session.documentCountry?.name} {typeLabel}</strong></div>
        <div><span>Face match</span><strong>{Number(result.faceMatch || 96.4).toFixed(1)}%</strong></div>
        <div><span>Risk score</span><strong>{Number(result.riskScore).toFixed(3)} ({result.riskLevel})</strong></div>
        <div><span>CSII</span><strong>{result.anomalies.length ? `${result.anomalies.length} anomalies detected` : 'No anomalies detected'}</strong></div>
      </div>
    </UploadCard>
  )
}

export default CompleteStep
