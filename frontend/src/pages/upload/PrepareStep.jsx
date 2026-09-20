import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentTypes } from '../../components/upload/DocumentTypeSelector'
import { flagEmoji } from '../../components/upload/CountrySelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { fileToBase64 } from '../../utils/camera'
import { UploadCard } from './UploadRouter'

function requiresBack(documentType) {
  return documentTypes.find(type => type.id === documentType)?.requiresBack
}

function UploadDrop({ title, uploaded, preview, onSelect }) {
  const inputRef = useRef(null)
  return (
    <button className={`upload-drop ${uploaded ? 'uploaded' : ''}`} type="button" onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={event => event.target.files?.[0] && onSelect(event.target.files[0])} />
      {preview && String(preview).startsWith('data:image') ? <img src={preview} alt="" /> : <span>⇧</span>}
      <strong>{uploaded ? `✓ ${title} uploaded` : title}</strong>
      <small>Choose from your device</small>
      <em>JPG, JPEG, PNG, WEBP, PDF - less than 10MB</em>
    </button>
  )
}

function PrepareStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [frontPreview, setFrontPreview] = useState(session.documentFrontBase64)
  const [backPreview, setBackPreview] = useState(session.documentBackBase64)
  const [error, setError] = useState('')
  const needsBack = requiresBack(session.documentType)
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'

  const selectFile = async (file, side) => {
    setError('')
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB.')
      return
    }
    const base64 = await fileToBase64(file)
    if (side === 'front') {
      setFrontPreview(base64)
      newSessionStore.setDocumentFiles({ frontFile: file, frontBase64: base64, captureMethod: 'upload' })
    } else {
      setBackPreview(base64)
      newSessionStore.setDocumentFiles({ backFile: file, backBase64: base64, captureMethod: 'upload' })
    }
  }

  const canContinue = Boolean(frontPreview && (!needsBack || backPreview))

  return (
    <UploadCard
      step={step}
      title="Prepare your document"
      subtitle="You will need to scan both sides of your ID. Make sure you capture a clear and complete image"
      backTo="/upload/document-type"
      footer={<>
        <button className="upload-secondary" type="button" onClick={() => newSessionStore.setCaptureSide('front')}>Upload from device</button>
        <button className="upload-primary" type="button" onClick={() => canContinue ? navigate('/upload/document-results') : navigate('/upload/capture')}>{canContinue ? 'Analyze document' : 'Take photo of the front side'}</button>
      </>}
    >
      <div className="info-chip-row">
        <div><span>COUNTRY OF DOCUMENT</span><strong>{flagEmoji(session.documentCountry?.code)} {session.documentCountry?.name}</strong></div>
        <div><span>DOCUMENT TYPE</span><strong>{typeLabel}</strong></div>
      </div>
      <UploadDrop title="Front of your document" uploaded={Boolean(frontPreview)} preview={frontPreview} onSelect={file => selectFile(file, 'front')} />
      {frontPreview && needsBack && <UploadDrop title="Back of your document" uploaded={Boolean(backPreview)} preview={backPreview} onSelect={file => selectFile(file, 'back')} />}
      {error && <p className="upload-error">{error}</p>}
    </UploadCard>
  )
}

export default PrepareStep
