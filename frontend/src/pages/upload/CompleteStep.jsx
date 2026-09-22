import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FinalVerificationPage from '../FinalVerificationPage'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { saveUploadSession } from '../../services/sessionVerification'
import { UploadCard } from './UploadRouter'

function CompleteStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const savedRef = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session.savedSessionId || savedRef.current) return
    savedRef.current = true
    try {
      const saved = saveUploadSession(session)
      if (!saved?.id) throw new Error('The session record could not be created.')
      newSessionStore.setSavedSessionId(saved.id)
    } catch (err) {
      savedRef.current = false
      setError(err.message || 'The session could not be saved.')
    }
  }, [session])

  const startAnother = () => {
    newSessionStore.reset()
    navigate('/upload/authorize')
  }

  if (error) {
    return (
      <UploadCard
        step={step}
        title="Session could not be saved"
        subtitle={error}
        footer={<>
          <button className="upload-secondary" type="button" onClick={() => navigate('/upload/processing')}>Back</button>
          <button className="upload-primary" type="button" onClick={() => { setError(''); savedRef.current = false }}>Try again</button>
        </>}
      >
        <p className="upload-error" role="alert">The final verification screen needs a saved session record before officer decisions can be audited.</p>
      </UploadCard>
    )
  }

  if (!session.savedSessionId) {
    return (
      <UploadCard step={step} title="Preparing final verification" subtitle="Saving document, face, OCR, MRZ, and risk evidence for officer review.">
        <div className="processing-meter"><span style={{ width: '82%' }} /></div>
      </UploadCard>
    )
  }

  return <FinalVerificationPage sessionId={session.savedSessionId} embedded onStartAnother={startAnother} />
}

export default CompleteStep
