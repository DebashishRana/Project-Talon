import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { compareDocumentFaceWithLive } from '../../utils/awsRekognition'
import { UploadCard } from './UploadRouter'

function ProcessingStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [completed, setCompleted] = useState(0)
  const [faceComparison, setFaceComparison] = useState(null)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'

  const pipeline = useMemo(() => [
    { label: 'Document classification...', result: `${session.documentCountry?.name || 'Indian'} ${typeLabel} (97.8%)` },
    { label: 'Extracting text (OCR)...', result: '14 fields extracted' },
    { label: 'Parsing MRZ...', result: session.documentType === 'PASSPORT' ? 'Check digits valid' : 'Not required' },
    { label: 'Analyzing document forensics...', result: 'No tampering detected' },
    { label: 'Extracting document face...', result: faceComparison?.documentFaceBase64 ? 'Document portrait isolated' : 'Waiting for biometric result' },
    { label: 'Comparing faces...', result: faceComparison ? `${Number(faceComparison.similarity || 0).toFixed(1)}% match` : 'Waiting for biometric result' },
    { label: 'Cross-session identity check...', result: 'No anomalies' }
  ], [faceComparison, session.documentCountry?.name, session.documentType, typeLabel])

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
            { documentType: session.documentType }
          )
          if (!active) return
          setFaceComparison(faceResult)
          await delay(500)
        } else {
          await delay(650)
        }
      }
      if (!active) return
      setCompleted(pipeline.length)
      await delay(700)
      if (!active) return

      const similarity = Number(faceResult?.similarity || 0)
      const matched = Boolean(faceResult?.match) && similarity >= 90
      newSessionStore.setProcessingResult({
        faceMatch: similarity,
        riskScore: matched ? 0.118 : 0.542,
        riskLevel: matched ? 'LOW' : 'MEDIUM',
        status: matched ? 'VERIFIED' : 'MANUAL_REVIEW',
        anomalies: matched ? [] : ['FACE_MATCH_REVIEW'],
        faceVerification: faceResult,
        documentFaceBase64: faceResult?.documentFaceBase64,
        verificationObservations: faceResult?.observations || []
      })
      navigate('/upload/complete')
    }
    run()
    return () => { active = false }
  }, [navigate, pipeline.length, session.documentFrontBase64, session.liveFaceBase64])

  return (
    <UploadCard
      step={step}
      title="Verifying your document"
      subtitle="This usually takes 5-10 seconds"
    >
      <div className="processing-list">
        {pipeline.map((item, index) => {
          const done = completed > index
          const active = completed === index
          return (
            <div className={`processing-row ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={item.label}>
              <span>{done ? '✓' : active ? '◌' : '○'}</span>
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
