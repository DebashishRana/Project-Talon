import React, { useEffect, useRef, useState } from 'react'
import { captureVideoFrame, requestCameraStream, stopCameraStream } from '../../utils/camera'
import DocumentFrameOverlay from './DocumentFrameOverlay'
import FaceFrameOverlay from './FaceFrameOverlay'

function CameraOverlay({ title, mode = 'document', onBack, onCapture, onAutoStable }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [stable, setStable] = useState(false)
  const [instruction, setInstruction] = useState(mode === 'face' ? 'Position your face in the circle' : 'Align the document inside the frame')

  useEffect(() => {
    let cancelled = false
    requestCameraStream({ facingMode: mode === 'face' ? 'user' : 'environment' })
      .then(stream => {
        if (cancelled) return stopCameraStream(stream)
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(cameraError => setError(cameraError.message))

    return () => {
      cancelled = true
      stopCameraStream(streamRef.current)
    }
  }, [mode])

  useEffect(() => {
    const messages = mode === 'face'
      ? ['Position your face in the circle', 'Look straight ahead', 'Hold steady']
      : ['Move closer', 'Avoid glare', 'Hold steady']
    let index = 0
    const interval = window.setInterval(() => {
      index += 1
      setInstruction(messages[index % messages.length])
    }, 1100)
    const stableTimer = window.setTimeout(() => {
      setStable(true)
      setInstruction('Hold steady')
      onAutoStable?.()
    }, mode === 'face' ? 2200 : 2600)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(stableTimer)
    }
  }, [mode, onAutoStable])

  const takePhoto = () => {
    try {
      onCapture(captureVideoFrame(videoRef.current))
    } catch (captureError) {
      setError(captureError.message)
    }
  }

  return (
    <div className="camera-page">
      <header className="camera-topbar">
        <button type="button" onClick={onBack} aria-label="Back">‹</button>
        <strong>{title}</strong>
        <span />
      </header>
      <div className="camera-instructions">
        <span>☼ Find good lighting</span>
        <span>◉ Keep details readable</span>
        <span>⊘ Avoid screen captures</span>
      </div>
      <div className="camera-stage">
        {error ? <div className="camera-error">{error}</div> : <video ref={videoRef} autoPlay playsInline muted />}
        {mode === 'face'
          ? <FaceFrameOverlay stable={stable} instruction={instruction} />
          : <DocumentFrameOverlay instruction={instruction} />}
      </div>
      <button className="shutter-button" type="button" onClick={takePhoto} aria-label="Capture photo" />
      <p className="auto-capture-text">Auto-capture enabled</p>
    </div>
  )
}

export default CameraOverlay
