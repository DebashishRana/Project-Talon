import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraOverlay from '../../components/upload/CameraOverlay'
import FaceFrameOverlay from '../../components/upload/FaceFrameOverlay'
import { newSessionStore } from '../../store/newSessionStore'
import { detectFacesStub } from '../../utils/awsRekognition'
import { UploadCard } from './UploadRouter'

function FaceStep({ step }) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [faceOk, setFaceOk] = useState(false)

  useEffect(() => {
    let active = true
    if (preview) {
      detectFacesStub(preview).then(result => active && setFaceOk(result.detected))
    }
    return () => { active = false }
  }, [preview])

  if (!preview) {
    return (
      <CameraOverlay
        title="Face verification"
        mode="face"
        onBack={() => navigate('/upload/prepare')}
        onCapture={setPreview}
      />
    )
  }

  return (
    <UploadCard
      step={step}
      title="Face verification"
      subtitle="Look directly at the camera and ensure your face is well-lit"
      backTo="/upload/prepare"
      footer={<>
        <button className="upload-secondary" type="button" onClick={() => { setPreview(null); setFaceOk(false) }}>Retake</button>
        <button className="upload-primary" type="button" disabled={!faceOk} onClick={() => { newSessionStore.setLiveFace(preview); navigate('/upload/processing') }}>Confirm</button>
      </>}
    >
      <div className="face-confirm">
        <img src={preview} alt="Captured face" />
        <FaceFrameOverlay stable={faceOk} instruction={faceOk ? 'Face captured' : 'Checking face quality'} />
      </div>
      <div className="face-checklist">
        <span>✓ Face fully visible</span>
        <span>✓ Good lighting</span>
        <span>✓ No sunglasses or masks</span>
        <span>✓ Neutral expression</span>
      </div>
    </UploadCard>
  )
}

export default FaceStep
