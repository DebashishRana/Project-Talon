import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
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

function riskFromEvidence(faceResult, analysis, documentType) {
  const similarity = Number(faceResult?.similarity || 0)
  const classifier = statusFromClassifier(analysis)
  const ocr = statusFromOcr(analysis)
  const mrz = statusFromMrz(analysis, documentType)
  const anomalies = []

  if (!faceResult?.match || similarity < 90) anomalies.push('FACE_MATCH_REVIEW')
  if (classifier.status !== 'PASS') anomalies.push('DOCUMENT_CLASSIFICATION_REVIEW')
  if (ocr.status !== 'PASS') anomalies.push('OCR_REVIEW')
  if (mrz.status === 'REVIEW') anomalies.push('MRZ_REVIEW')

  const riskScore = Math.min(0.95, 0.08 + anomalies.length * 0.16 + Math.max(0, 90 - similarity) / 100)
  return {
    anomalies,
    riskScore,
    riskLevel: anomalies.length === 0 ? 'LOW' : anomalies.length <= 2 ? 'MEDIUM' : 'HIGH',
    status: anomalies.length === 0 ? 'VERIFIED' : 'MANUAL_REVIEW'
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
    return [
      { label: 'Document classification...', result: classifier.detail, status: classifier.status },
      { label: 'Extracting text (OCR)...', result: ocr.detail, status: ocr.status },
      { label: 'Parsing MRZ...', result: mrz.detail, status: mrz.status },
      { label: 'Analyzing document forensics...', result: 'Tampering detector not connected', status: 'NOT_RUN' },
      { label: 'Extracting document face...', result: faceComparison?.documentFaceBase64 ? 'Document portrait isolated' : 'Waiting for biometric result', status: faceComparison?.documentFaceBase64 ? 'PASS' : 'REVIEW' },
      { label: 'Comparing faces...', result: faceComparison ? `${Number(faceComparison.similarity || 0).toFixed(1)}% match` : 'Waiting for biometric result', status: faceComparison?.match ? 'PASS' : 'REVIEW' },
      { label: 'Preparing session evidence...', result: `${typeLabel} verification package`, status: 'PASS' }
    ]
  }, [analysis, faceComparison, session.documentType, typeLabel])

  useEffect(() => {
    let active = true
    const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms))

    async function run() {
      let faceResult = null
      for (let index = 0; index < pipeline.length; index += 1) {
        if (!active) return
        setCompleted(index)
        if (index === 4) {
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
  }, [analysis, navigate, pipeline.length, session.documentFrontBase64, session.documentFrontFile?.name, session.documentType, session.liveFaceBase64])

  return (
    <UploadCard
      step={step}
      title="Verifying your document"
      subtitle="Running document evidence and face comparison"
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
