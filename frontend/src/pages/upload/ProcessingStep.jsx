import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../data/documentTypes'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { compareDocumentFaceWithLive } from '../../utils/awsRekognition'
import { subjectFields } from '../../utils/documentAnalysis'
import { UploadCard } from './UploadRouter'

function statusFromClassifier(analysis) {
  const classifier = analysis?.classifier || {}
  const expected = Boolean(classifier.expected_document)
  const confidence = Number(classifier.confidence || 0)
  if (!analysis) return { status: 'REVIEW', detail: 'Document analysis is missing.' }
  return {
    status: expected ? 'PASS' : 'REVIEW',
    detail: `${classifier.document_type || 'Unknown'} (${(confidence * 100).toFixed(1)}%)`
  }
}

function statusFromOcr(analysis) {
  const text = analysis?.metadata?.extracted_text || ''
  const fields = subjectFields(analysis)
  const fieldCount = Object.values(fields).filter(Boolean).length
  if (!text.trim()) return { status: 'REVIEW', detail: 'No readable OCR text extracted.' }
  return { status: 'PASS', detail: `${fieldCount} identity fields available` }
}

function statusFromMrz(analysis, documentType) {
  if (documentType !== 'PASSPORT') return { status: 'SKIPPED', detail: 'Not required for this document type' }
  const mrz = analysis?.mrz
  if (!mrz?.detected) return { status: 'REVIEW', detail: 'Passport MRZ not found in OCR text' }
  return {
    status: mrz.status === 'valid' ? 'PASS' : 'REVIEW',
    detail: mrz.status === 'valid' ? 'Check digits valid' : `${mrz.issues?.length || 0} MRZ issue(s)`
  }
}

function statusFromForensics(analysis) {
  const forensics = analysis?.forensics || {}
  if (!analysis) return { status: 'REVIEW', detail: 'Document analysis is missing.' }
  if (!forensics.status || forensics.status === 'NOT_RUN') {
    return { status: 'SKIPPED', detail: forensics.detail || 'Forensic detector not connected' }
  }
  return {
    status: forensics.status,
    detail: forensics.detail || 'Forensic check completed'
  }
}

function documentConfidenceFromEvidence(analysis, documentType) {
  const classifier = statusFromClassifier(analysis)
  const ocr = statusFromOcr(analysis)
  const mrz = statusFromMrz(analysis, documentType)
  const forensics = statusFromForensics(analysis)
  const classifierConfidence = Number(analysis?.classifier?.confidence || 0) * 100
  let score = classifierConfidence || 50

  if (classifier.status === 'PASS') score += 8
  else score -= 18
  if (ocr.status === 'PASS') score += 8
  else score -= 15
  if (mrz.status === 'PASS') score += 8
  if (mrz.status === 'REVIEW') score -= 18
  if (forensics.status === 'REVIEW') score -= 20
  if (forensics.status === 'FAIL') score -= 35

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

function riskFromEvidence(faceResult, analysis, documentType) {
  const similarity = Number(faceResult?.similarity || 0)
  const classifier = statusFromClassifier(analysis)
  const ocr = statusFromOcr(analysis)
  const mrz = statusFromMrz(analysis, documentType)
  const forensics = statusFromForensics(analysis)
  const documentConfidence = documentConfidenceFromEvidence(analysis, documentType)
  const anomalies = []

  if (!faceResult?.match || similarity < 90) anomalies.push('FACE_MATCH_REVIEW')
  if (classifier.status !== 'PASS') anomalies.push('DOCUMENT_CLASSIFICATION_REVIEW')
  if (ocr.status !== 'PASS') anomalies.push('OCR_REVIEW')
  if (mrz.status === 'REVIEW') anomalies.push('MRZ_REVIEW')
  if (forensics.status === 'REVIEW' || forensics.status === 'FAIL') anomalies.push('DOCUMENT_FORENSICS_REVIEW')
  if (documentConfidence < 60) anomalies.push('DOCUMENT_RISKY')
  else if (documentConfidence < 75) anomalies.push('DOCUMENT_SUSPICIOUS')

  const riskScore = Math.min(0.95, 0.08 + anomalies.length * 0.16 + Math.max(0, 90 - similarity) / 100)
  const confidenceRequiresReview = documentConfidence < 75
  return {
    anomalies,
    documentConfidence,
    riskScore,
    riskLevel: documentConfidence < 60 || anomalies.length > 2 ? 'HIGH' : confidenceRequiresReview || anomalies.length ? 'MEDIUM' : 'LOW',
    status: confidenceRequiresReview || anomalies.length ? 'MANUAL_REVIEW' : 'VERIFIED'
  }
}

function ProcessingStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [completed, setCompleted] = useState(0)
  const [faceComparison, setFaceComparison] = useState(null)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'
  const analysis = session.documentAnalysis

  const pipeline = useMemo(() => {
    const classifier = statusFromClassifier(analysis)
    const ocr = statusFromOcr(analysis)
    const mrz = statusFromMrz(analysis, session.documentType)
    const forensics = statusFromForensics(analysis)
    return [
      { id: 'classification', label: 'Document classification...', result: classifier.detail, status: classifier.status },
      { id: 'ocr', label: 'Extracting text (OCR)...', result: ocr.detail, status: ocr.status },
      { id: 'mrz', label: 'Parsing MRZ...', result: mrz.detail, status: mrz.status },
      { id: 'forensics', label: 'Forensic document checks...', result: forensics.detail, status: forensics.status },
      { id: 'face', label: 'Extracting and comparing faces...', result: faceComparison ? `${Number(faceComparison.similarity || 0).toFixed(1)}% match` : 'Waiting for biometric result', status: faceComparison?.match ? 'PASS' : 'REVIEW' },
      { id: 'package', label: 'Preparing forensic evidence...', result: `${typeLabel} verification package`, status: 'PASS' }
    ]
  }, [analysis, faceComparison, session.documentType, typeLabel])
  const faceStepIndex = useMemo(() => pipeline.findIndex(item => item.id === 'face'), [pipeline])

  useEffect(() => {
    let active = true
    const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms))

    async function run() {
      let faceResult = null
      for (let index = 0; index < pipeline.length; index += 1) {
        if (!active) return
        setCompleted(index)
        if (index === faceStepIndex) {
          faceResult = await compareDocumentFaceWithLive(
            session.documentFrontBase64,
            session.liveFaceBase64,
            {
              documentType: session.documentType,
              documentFilename: session.documentFrontFile?.name || analysis?.filename || 'document.jpg'
            }
          )
          if (!active) return
          setFaceComparison(faceResult)
          await delay(500)
        } else {
          await delay(450)
        }
      }
      if (!active) return
      setCompleted(pipeline.length)
      await delay(500)
      if (!active) return

      const evidenceRisk = riskFromEvidence(faceResult, analysis, session.documentType)
      newSessionStore.setProcessingResult({
        faceMatch: Number(faceResult?.similarity || 0),
        documentConfidence: evidenceRisk.documentConfidence,
        riskScore: evidenceRisk.riskScore,
        riskLevel: evidenceRisk.riskLevel,
        status: evidenceRisk.status,
        anomalies: evidenceRisk.anomalies,
        faceVerification: faceResult,
        documentFaceBase64: faceResult?.documentFaceBase64,
        verificationObservations: faceResult?.observations || []
      })
      navigate('/upload/complete')
    }

    run()
    return () => { active = false }
  }, [analysis, faceStepIndex, navigate, pipeline.length, session.documentFrontBase64, session.documentFrontFile?.name, session.documentType, session.liveFaceBase64])

  return (
    <UploadCard
      step={step}
      title="Face and forensic verification"
      subtitle="Running biometric comparison and forensic evidence checks"
      className="processing-card"
    >
      <div className="processing-list">
        {pipeline.map((item, index) => {
          const done = completed > index
          const active = completed === index
          return (
            <div className={`processing-row ${done ? 'done' : ''} ${active ? 'active' : ''} ${String(item.status || '').toLowerCase()}`} key={item.label}>
              <span>{done ? 'OK' : active ? '..' : '-'}</span>
              <strong>{item.label}</strong>
              <small>{done ? item.result : ''}</small>
            </div>
          )
        })}
      </div>
      <div className="processing-meter"><span style={{ width: `${Math.round((completed / pipeline.length) * 100)}%` }} /></div>
    </UploadCard>
  )
}

export default ProcessingStep
