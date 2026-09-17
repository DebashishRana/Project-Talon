import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { newSessionStore } from '../../store/newSessionStore'
import { UploadCard } from './UploadRouter'

function makeToken(email = 'pending@ssb.gov.in') {
  const expiresAt = Date.now() + 30000
  return JSON.stringify({
    officerId: email,
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          setToken(makeToken(email || 'pending@ssb.gov.in'))
          return 30
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [email])

  const credentialsValid = useMemo(() => {
    return /@(ssb|mha)\.gov\.in$/i.test(email.trim()) && password.length >= 1
  }, [email, password])

  const canContinue = tab === 'qr' || credentialsValid

  const authorize = () => {
    const officerId = tab === 'qr'
      ? (email && /@(ssb|mha)\.gov\.in$/i.test(email) ? email : 'officer.sharma@ssb.gov.in')
      : email.trim().toLowerCase()
    newSessionStore.setOfficer({ officerId, officerEmail: officerId, rememberDevice: remember })
    navigate('/upload/document-type')
  }

  return (
    <UploadCard
      step={step}
      title="Officer Authorization"
      subtitle="Verify your identity to begin a screening session"
      footer={<button className="upload-primary" type="button" disabled={!canContinue} onClick={authorize}>Authorize & Continue</button>}
    >
      <div className="auth-tabs">
        <button className={tab === 'qr' ? 'active' : ''} type="button" onClick={() => setTab('qr')}>Authenticator QR</button>
        <button className={tab === 'password' ? 'active' : ''} type="button" onClick={() => setTab('password')}>Login & Password</button>
      </div>
      {tab === 'qr' ? (
        <div className="qr-panel">
          <p>Scan this code with your TALON Authenticator app to authorize this session</p>
          <QRCodeSVG value={token} size={256} level="M" includeMargin />
          <strong>Expires in {seconds}s</strong>
          <small>Session will be tied to your officer ID for audit purposes</small>
        </div>
      ) : (
        <div className="login-panel">
          <label>Email<input value={email} onChange={event => setEmail(event.target.value)} placeholder="officer@ssb.gov.in" /></label>
          <label>Password<span><input value={password} type={showPassword ? 'text' : 'password'} onChange={event => setPassword(event.target.value)} placeholder="Password" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          <label className="remember-row"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember this device for 24 hours</label>
          <button className="forgot-link" type="button">Forgot password?</button>
        </div>
      )}
      <p className="upload-note">ⓘ All authorization attempts are logged in the audit trail.</p>
    </UploadCard>
  )
}

export default AuthorizeStep
