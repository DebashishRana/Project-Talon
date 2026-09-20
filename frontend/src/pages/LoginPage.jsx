import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showWhatsIncluded, setShowWhatsIncluded] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = event => {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <section className="auth-left">
        <div className="auth-left-content">
          <h1 className="auth-left-title">Talon verification workspace</h1>
          <p className="auth-left-subtitle">Document, biometric, and forensic evidence for border verification operations.</p>
          <div className="auth-dropdown">
            <button className="dropdown-button" type="button" onClick={() => setShowWhatsIncluded(value => !value)}>
              Verification capabilities <span className={`dropdown-arrow ${showWhatsIncluded ? 'rotated' : ''}`}>v</span>
            </button>
            {showWhatsIncluded && <div className="dropdown-content"><p>Document verification</p><p>Face comparison</p><p>Evidence and CSII review</p></div>}
          </div>
        </div>
      </section>
      <section className="auth-right">
        <div className="auth-right-content">
          <div className="auth-form-container">
            <h1 className="auth-form-title">Sign in</h1>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label" htmlFor="login-email">Email</label>
                <input id="login-email" type="email" placeholder="officer@agency.gov.in" value={email} onChange={event => setEmail(event.target.value)} className="auth-input" required />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="login-password">Password</label>
                <input id="login-password" type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} className="auth-input" required />
              </div>
              <button type="submit" className="auth-submit-button login">Sign in</button>
            </form>
            <p className="auth-legal">Authorized personnel only. Authentication attempts are recorded in the audit trail.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LoginPage
