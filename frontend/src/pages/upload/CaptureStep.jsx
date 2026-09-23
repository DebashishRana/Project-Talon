import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraOverlay from '../../components/upload/CameraOverlay'
import { flagEmoji } from '../../components/upload/CountrySelector'
import { documentTypes } from '../../data/documentTypes'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'

function requiresBack(documentType) {
  return documentTypes.find(type => type.id === documentType)?.requiresBack
}

function CaptureStep() {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [preview, setPreview] = useState(null)
  const side = session.captureSide || 'front'
  const typeLabel = documentTypes.find(type => type.id === session.documentType)?.label || 'Document'

  const usePhoto = () => {
    if (side === 'front') {
      newSessionStore.setDocumentFiles({ frontBase64: preview, captureMethod: 'camera' })
      if (requiresBack(session.documentType)) {
        newSessionStore.setCaptureSide('back')
        setPreview(null)
      } else {
        navigate('/upload/document-results')
      }
    } else {
      newSessionStore.setDocumentFiles({ backBase64: preview, captureMethod: 'camera' })
      newSessionStore.setCaptureSide('front')
      navigate('/upload/document-results')
    }
  }

  if (preview) {
    return (
      <div className="camera-page confirmation">
        <header className="camera-topbar"><button type="button" onClick={() => setPreview(null)}>‹</button><strong>Confirm capture</strong><span /></header>
        <img className="capture-preview" src={preview} alt="Captured document" />
        <div className="capture-actions">
          <button className="upload-secondary" type="button" onClick={() => setPreview(null)}>Retake</button>
          <button className="upload-primary" type="button" onClick={usePhoto}>Use this photo</button>
        </div>
      </div>
    )
  }

  return (
    <CameraOverlay
      title={`${flagEmoji(session.documentCountry?.code)} ${session.documentCountry?.name} ${typeLabel} - ${side === 'front' ? 'Front' : 'Back'}`}
      mode="document"
      onBack={() => navigate('/upload/prepare')}
      onCapture={setPreview}
    />
  )
}

export default CaptureStep
