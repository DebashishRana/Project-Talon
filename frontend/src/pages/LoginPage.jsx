import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

function LoginPage() {
  const [isLogin, setIsLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('India')
  const [receiveUpdates, setReceiveUpdates] = useState(false)
  const [showWhatsIncluded, setShowWhatsIncluded] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // For now, just navigate to dashboard
    // In production, you'd handle authentication here
    navigate('/dashboard')
  }

  const isValidPassword = (password) => {
    const hasMinLength = password.length >= 15 || (password.length >= 8 && /[0-9]/.test(password) && /[a-z]/.test(password))
    return hasMinLength
  }

  const isValidUsername = (username) => {
    const validPattern = /^[a-zA-Z0-9\-]+$/
    const validStart = !username.startsWith('-')
    const validEnd = !username.endsWith('-')
    return validPattern.test(username) && validStart && validEnd
  }

  return (
    <div className="auth-page">
      {/* Left Side - Dark Section */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h1 className="auth-left-title">Get started with Talon today.</h1>
          <p className="auth-left-subtitle">
            Arsenal of verification tools for Ministry of Home affairs, law enforcement and national intellgence
          </p>
          <div className="auth-dropdown">
            <button 
              className="dropdown-button"
              onClick={() => setShowWhatsIncluded(!showWhatsIncluded)}
            >
              See what's included
              <svg 
                className={`dropdown-arrow ${showWhatsIncluded ? 'rotated' : ''}`}
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showWhatsIncluded && (
              <div className="dropdown-content">
                <p>• Document verification</p>
                <p>• Secure storage</p>
                <p>• Quick scanning</p>
                <p>• Export capabilities</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="auth-right">
        <div className="auth-right-content">
          {/* Top Right Links */}
          <div className="auth-header">
            <p className="auth-toggle-text">
              {isLogin ? 'Don\'t have an account? ' : 'Already have an account? '}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="auth-toggle-link"
              >
                {isLogin ? 'Sign up →' : 'Sign in →'}
              </button>
            </p>
          </div>

          {/* Main Form */}
          <div className="auth-form-container">
            <h1 className="auth-form-title">
              {isLogin ? 'Welcome back' : 'Sign up for Dectra'}
            </h1>

           

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="auth-form">
        
              {/* Email Field */}
              <div className="input-group">
                <label className="input-label">Email*</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="input-group">
                <label className="input-label">Password*</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  required
                />
                {!isLogin && (
                  <p className="input-hint">
                    Password should be at least 15 characters OR at least 8 characters including a number and a lowercase letter.
                  </p>
                )}
              </div>

              {/* Username Field (Sign up only) */}
              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Username*</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <p className="input-hint">
                    Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.
                  </p>
                </div>
              )}

              {/* Country Field (Sign up only) */}
              {!isLogin && (
                <div className="input-group">
                  <label className="input-label">Your Country/Region*</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="auth-select"
                    required
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Japan">Japan</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="input-hint compliance-text">
                    For compliance reasons, we're required to collect country information to send you occasional updates and announcements.
                  </p>
                </div>
              )}

              {/* Email Preferences (Sign up only) */}
              {!isLogin && (
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={receiveUpdates}
                      onChange={(e) => setReceiveUpdates(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Receive occasional product updates and announcements</span>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className={`auth-submit-button ${isLogin ? 'login' : 'signup'}`}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            {/* Legal Text */}
            {isLogin && (
              <p className="auth-legal">
                By signing in, you agree to our{' '}
                <a href="#" className="legal-link">Terms of Service</a> and{' '}
                <a href="#" className="legal-link">Privacy Statement</a>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

