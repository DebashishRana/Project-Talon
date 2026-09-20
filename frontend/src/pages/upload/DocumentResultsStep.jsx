import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { analyzeUploadedDocument } from '../../utils/documentAnalysis'
import DocumentEvidence from './DocumentEvidence'
import { UploadCard } from './UploadRouter'

export default function DocumentResultsStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [analysis, setAnalysis] = useState(session.documentAnalysis)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (analysis) return
    let active = true
    analyzeUploadedDocument(session).then(result => {
      if (!active) return
      newSessionStore.setDocumentAnalysis(result)
      setAnalysis(result)
    }).catch(reason => {
      if (active) setError(reason.response?.data?.detail || reason.message)
    })
    return () => { active = false }
  }, [attempt, analysis, session.documentFrontBase64])

  return (
    <UploadCard step={step} title="Document analysis" subtitle={analysis?.filename || 'Extracting document evidence'} className="upload-card-wide" backTo="/upload/prepare" footer={<>
      {error && <button className="upload-secondary" type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Retry analysis</button>}
      <button className="upload-primary" type="button" disabled={!analysis} onClick={() => navigate('/upload/face')}>Continue to face verification</button>
    </>}>
      {error && <p className="upload-error" role="alert">{error}</p>}
      {!analysis && !error && <div className="document-loading" role="status">Analyzing the uploaded document...</div>}
      {analysis && <div className="document-results-layout">
        <div className="document-image-panel">{session.documentFrontBase64?.startsWith('data:image') ? <img src={session.documentFrontBase64} alt="Uploaded document" /> : <span>Document preview unavailable</span>}</div>
        <DocumentEvidence analysis={analysis} />
      </div>}
    </UploadCard>
  )
}
