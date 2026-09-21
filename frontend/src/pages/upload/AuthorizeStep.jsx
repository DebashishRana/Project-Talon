import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { newSessionStore } from '../../store/newSessionStore'
import { useRBACStore } from '../../store/rbacStore'
import { useCheckpointStore } from '../../store/checkpointStore'
import { resolveCheckpoint } from '../../data/checkpoints'
import { UploadCard } from './UploadRouter'

function makeToken(officerId = 'signed-out') {
  const expiresAt = Date.now() + 30000
  return JSON.stringify({
    officerId,
    sessionNonce: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    expiresAt
  })
}

function AuthorizeStep({ step }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('qr')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [token, setToken] = useState(() => makeToken())
  const [seconds, setSeconds] = useState(30)
  const [authorizationError, setAuthorizationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const currentUser = useRBACStore(state => state.users.find(user => user.id === state.currentUserId))
  const authenticate = useRBACStore(state => state.authenticate)
  const checkpoints = useCheckpointStore(state => state.checkpoints)
  const assignedCheckpoint = resolveCheckpoint(currentUser?.checkpointId, checkpoints)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          setToken(makeToken(currentUser?.id))
          return 30
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [currentUser?.id])

  useEffect(() => {
    if (!email && currentUser?.email) setEmail(currentUser.email)
  }, [currentUser?.email, email])

  const credentialsPresent = useMemo(() => Boolean(email.trim() && password), [email, password])
  const currentAccountActive = currentUser?.status === 'ACTIVE'
  const canContinue = tab === 'qr' ? currentAccountActive && Boolean(assignedCheckpoint) : credentialsPresent

  const authorize = async () => {
    setAuthorizationError('')
    setSubmitting(true)
    try {
      let officer = currentUser
      if (tab === 'password') {
        const result = await authenticate(email, password)
        if (!result.success) {
          setAuthorizationError(result.message)
          return
        }
        officer = result.user
      }

      if (!officer || officer.status !== 'ACTIVE') {
        setAuthorizationError('Your active TALON account is required to start a screening session.')
        return
      }

      if (!useRBACStore.getState().hasPermission(officer.id, 'sessions', 'create')) {
        setAuthorizationError('This account cannot create screening sessions.')
        return
      }
      const assigned = resolveCheckpoint(officer.checkpointId, useCheckpointStore.getState().checkpoints)
      if (!assigned) {
        setAuthorizationError(officer.checkpointId ? 'Your assigned checkpoint is not in the directory. Ask an administrator to update your assignment.' : 'This account does not have a designated checkpoint. Ask an administrator to assign one before starting a screening session.')
        return
      }
      newSessionStore.setOfficer({ officerId: officer.id, officerEmail: officer.email, rememberDevice: remember, checkpoint: assigned })
      navigate('/upload/document-type')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UploadCard
      step={step}
      title="Officer Authorization"
      subtitle="Verify your identity to begin a screening session"
      footer={<button className="upload-primary" type="button" disabled={!canContinue || submitting} onClick={authorize}>{submitting ? 'Authorizing…' : 'Authorize & Continue'}</button>}
    >
      <div className="auth-tabs">
        <button className={tab === 'qr' ? 'active' : ''} type="button" onClick={() => setTab('qr')}>Authenticator QR</button>
        <button className={tab === 'password' ? 'active' : ''} type="button" onClick={() => setTab('password')}>Login & Password</button>
      </div>
      {tab === 'qr' ? (
        <div className="qr-panel">
          <p>Use your signed-in TALON account to authorize this session.</p>
          <QRCodeSVG value={token} size={256} level="M" includeMargin />
          <strong>Expires in {seconds}s</strong>
          <small>{currentUser ? `Session will be tied to ${currentUser.fullName} for audit purposes` : 'Sign in with an active TALON account first.'}</small>
        </div>
      ) : (
        <div className="login-panel">
          <label>Email<input value={email} onChange={event => setEmail(event.target.value)} placeholder="officer@ssb.gov.in" /></label>
          <label>Password<span><input value={password} type={showPassword ? 'text' : 'password'} onChange={event => setPassword(event.target.value)} placeholder="Password" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          <label className="remember-row"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember this device for 24 hours</label>
          <button className="forgot-link" type="button">Forgot password?</button>
        </div>
      )}
      <div className="assigned-checkpoint-panel" aria-live="polite">
        <span>Designated checkpoint</span>
        {assignedCheckpoint ? (
          <strong>{assignedCheckpoint.name}<small>{assignedCheckpoint.city}, {assignedCheckpoint.state}</small></strong>
        ) : (
          <strong className="missing">No checkpoint assigned<small>Update this officer profile in Settings before authorization.</small></strong>
        )}
      </div>
      {authorizationError && <p className="upload-error" role="alert">{authorizationError}</p>}
      <p className="upload-note">ⓘ All authorization attempts are logged in the audit trail.</p>
    </UploadCard>
  )
}

export default AuthorizeStep
