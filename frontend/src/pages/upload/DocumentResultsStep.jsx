import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { analyzeUploadedDocument } from '../../utils/documentAnalysis'
import DocumentEvidence from './DocumentEvidence'
import { UploadCard } from './UploadRouter'

function documentPreviewSource(dataUrl, file, analysis) {
  if (!dataUrl) return { kind: 'missing', src: '' }
  const value = String(dataUrl)
  const filename = String(file?.name || analysis?.filename || '').toLowerCase()
  const type = file?.type || (filename.endsWith('.pdf') ? 'application/pdf' : '')

  if (value.startsWith('data:image/')) return { kind: 'image', src: value }
  if (value.startsWith('data:application/pdf')) return { kind: 'pdf', src: value }
  if (value.startsWith('data:')) return { kind: 'unknown', src: value }
  if (type === 'application/pdf' || filename.endsWith('.pdf')) {
    return { kind: 'pdf', src: `data:application/pdf;base64,${value}` }
  }
  return { kind: 'image', src: `data:image/jpeg;base64,${value}` }
}

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
      <button className="upload-primary" type="button" disabled={!analysis} onClick={() => navigate('/upload/face')}>Continue to face and forensic verification</button>
    </>}>
      {error && <p className="upload-error" role="alert">{error}</p>}
      {!analysis && !error && <div className="document-loading" role="status">Analyzing the uploaded document...</div>}
      {analysis && <div className="document-results-layout">
        <div className="document-image-panel">
          {(() => {
            const preview = documentPreviewSource(session.documentFrontBase64, session.documentFrontFile, analysis)
            if (preview.kind === 'image') return <img src={preview.src} alt="Uploaded document front page" />
            if (preview.kind === 'pdf') return <iframe className="document-pdf-preview" src={`${preview.src}#page=1&view=FitH`} title="Uploaded document front page" />
            return <span>Document preview unavailable</span>
          })()}
        </div>
        <DocumentEvidence analysis={analysis} />
      </div>}
    </UploadCard>
  )
}
