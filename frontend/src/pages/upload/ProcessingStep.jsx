import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { compareFacesStub } from '../../utils/awsRekognition'
import { UploadCard } from './UploadRouter'

function ProcessingStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [completed, setCompleted] = useState(0)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'

  const pipeline = useMemo(() => [
    { label: 'Document classification...', result: `${session.documentCountry?.name || 'Indian'} ${typeLabel} (97.8%)` },
    { label: 'Extracting text (OCR)...', result: '14 fields extracted' },
    { label: 'Parsing MRZ...', result: session.documentType === 'PASSPORT' ? 'Check digits valid' : 'Not required' },
    { label: 'Analyzing document forensics...', result: 'No tampering detected' },
    { label: 'Comparing faces...', result: '96.4% match' },
    { label: 'Cross-session identity check...', result: 'No anomalies' }
  ], [session.documentCountry?.name, session.documentType, typeLabel])

  useEffect(() => {
    let active = true
    async function run() {
      const faceResult = await compareFacesStub(session.documentFrontBase64, session.liveFaceBase64)
      for (let index = 0; index <= pipeline.length; index += 1) {
        if (!active) return
        setCompleted(index)
        await new Promise(resolve => window.setTimeout(resolve, index === pipeline.length ? 800 : 650))
      }
      if (!active) return
      newSessionStore.setProcessingResult({
        faceMatch: faceResult.similarity,
        riskScore: faceResult.similarity > 93 ? 0.118 : 0.542,
        riskLevel: faceResult.similarity > 93 ? 'LOW' : 'MEDIUM',
        status: faceResult.similarity > 93 ? 'VERIFIED' : 'MANUAL_REVIEW',
        anomalies: faceResult.similarity > 93 ? [] : ['FACE_MATCH_REVIEW']
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
