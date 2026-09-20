import React, { useEffect, useRef, useState } from 'react'
import { captureFaceOvalFrame, captureVideoFrame, requestCameraStream, stopCameraStream, videoSourceRectForElement } from '../../utils/camera'
import DocumentFrameOverlay from './DocumentFrameOverlay'
import FaceFrameOverlay from './FaceFrameOverlay'

function normalizeFaceBox(box) {
  return {
    x: Number(box?.x ?? box?.left ?? 0),
    y: Number(box?.y ?? box?.top ?? 0),
    width: Number(box?.width ?? 0),
    height: Number(box?.height ?? 0)
  }
}

function isFaceInsideGuide(box, guide) {
  const face = normalizeFaceBox(box)
  if (!face.width || !face.height || !guide?.width || !guide?.height) return false

  const faceCenterX = face.x + face.width / 2
  const faceCenterY = face.y + face.height / 2
  const guideCenterX = guide.x + guide.width / 2
  const guideCenterY = guide.y + guide.height / 2
  const centerOk = Math.abs(faceCenterX - guideCenterX) <= guide.width * 0.18
    && Math.abs(faceCenterY - guideCenterY) <= guide.height * 0.16
  const sizeOk = face.width >= guide.width * 0.34
    && face.width <= guide.width * 1.05
    && face.height >= guide.height * 0.35
    && face.height <= guide.height * 1.08
  const boundsOk = face.x >= guide.x - guide.width * 0.12
    && face.y >= guide.y - guide.height * 0.12
    && face.x + face.width <= guide.x + guide.width * 1.12
    && face.y + face.height <= guide.y + guide.height * 1.12

  return centerOk && sizeOk && boundsOk
}

function CameraOverlay({ title, mode = 'document', onBack, onCapture, onAutoStable }) {
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const faceFrameRef = useRef(null)
  const streamRef = useRef(null)
  const autoStableSentRef = useRef(false)
  const [error, setError] = useState('')
  const [stable, setStable] = useState(false)
  const [faceState, setFaceState] = useState(mode === 'face' ? 'searching' : '')
  const [instruction, setInstruction] = useState(mode === 'face' ? 'Position your face in the oval' : 'Align the document inside the frame')
  const isFaceMode = mode === 'face'

  useEffect(() => {
    let cancelled = false
    setError('')
    setStable(false)
    setFaceState(mode === 'face' ? 'searching' : '')
    setInstruction(mode === 'face' ? 'Position your face in the oval' : 'Align the document inside the frame')
    autoStableSentRef.current = false

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
    if (mode === 'face') return undefined

    const messages = ['Move closer', 'Avoid glare', 'Hold steady']
    let index = 0
    const interval = window.setInterval(() => {
      index += 1
      setInstruction(messages[index % messages.length])
    }, 1100)
    const stableTimer = window.setTimeout(() => {
      setStable(true)
      setInstruction('Hold steady')
      onAutoStable?.()
    }, 2600)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(stableTimer)
    }
  }, [mode, onAutoStable])

  useEffect(() => {
    if (mode !== 'face') return undefined

    let active = true
    let detector = null

    async function detectFace() {
      const video = videoRef.current
      if (!active || !video?.videoWidth || !video?.videoHeight) return

      if (!('FaceDetector' in window)) {
        setStable(false)
        setFaceState('manual')
        setInstruction('Align your face inside the oval')
        return
      }

      try {
        detector = detector || new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
        const faces = await detector.detect(video)
        if (!active) return

        if (!faces.length) {
          setStable(false)
          setFaceState('not-detected')
          setInstruction('No face detected')
          autoStableSentRef.current = false
          return
        }

        const guide = videoSourceRectForElement(video, faceFrameRef.current, stageRef.current)
        const largestFace = faces.reduce((largest, face) => {
          const largestBox = normalizeFaceBox(largest.boundingBox)
          const faceBox = normalizeFaceBox(face.boundingBox)
          return faceBox.width * faceBox.height > largestBox.width * largestBox.height ? face : largest
        }, faces[0])
        const aligned = isFaceInsideGuide(largestFace.boundingBox, guide)

        setStable(aligned)
        setFaceState(aligned ? 'stable' : 'not-detected')
        setInstruction(aligned ? 'Face detected' : 'Center your face in the oval')

        if (aligned && !autoStableSentRef.current) {
          autoStableSentRef.current = true
          onAutoStable?.()
        }
        if (!aligned) autoStableSentRef.current = false
      } catch {
        setStable(false)
        setFaceState('manual')
        setInstruction('Align your face inside the oval')
      }
    }

    const interval = window.setInterval(detectFace, 650)
    detectFace()
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [mode, onAutoStable])

  const takePhoto = () => {
    try {
      const image = mode === 'face'
        ? captureFaceOvalFrame(videoRef.current, faceFrameRef.current, stageRef.current)
        : captureVideoFrame(videoRef.current)
      onCapture(image)
    } catch (captureError) {
      setError(captureError.message)
    }
  }

  const faceStatus = stable ? 'Face detected' : faceState === 'manual' ? 'Manual alignment' : 'Align face'
  const captureDisabled = Boolean(error) || (isFaceMode && faceState !== 'manual' && !stable)

  return (
    <div className={`camera-page ${isFaceMode ? 'face-camera' : ''}`}>
      <header className="camera-topbar">
        <button type="button" onClick={onBack} aria-label="Back">&lsaquo;</button>
        <strong>{title}</strong>
        <span />
      </header>
      {isFaceMode ? (
        <div className="face-camera-shell">
          <div className="camera-stage face-camera-stage" ref={stageRef}>
            {error ? <div className="camera-error">{error}</div> : <video ref={videoRef} autoPlay playsInline muted />}
            <FaceFrameOverlay ref={faceFrameRef} stable={stable} state={faceState} instruction={instruction} />
          </div>
          <aside className="face-camera-side">
            <span className={`face-status-pill ${stable ? 'ok' : 'alert'}`}>{faceStatus}</span>
            <h2>Take a selfie</h2>
            <p>Keep your face centered in the guide with even lighting.</p>
            <button className="face-capture-button" type="button" onClick={takePhoto} disabled={captureDisabled}>Submit</button>
          </aside>
        </div>
      ) : (
        <>
          <div className="camera-instructions">
            <span>Find good lighting</span>
            <span>Keep details readable</span>
            <span>Avoid screen captures</span>
          </div>
          <div className="camera-stage" ref={stageRef}>
            {error ? <div className="camera-error">{error}</div> : <video ref={videoRef} autoPlay playsInline muted />}
            <DocumentFrameOverlay instruction={instruction} />
          </div>
          <button className="shutter-button" type="button" onClick={takePhoto} aria-label="Capture photo" />
          <p className="auto-capture-text">Auto-capture enabled</p>
        </>
      )}
    </div>
  )
}

export default CameraOverlay
