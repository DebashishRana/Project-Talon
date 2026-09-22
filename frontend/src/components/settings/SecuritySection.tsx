import React from 'react'
import { Copy, KeyRound } from 'lucide-react'

interface SecuritySectionProps {
  values: {
    temporaryPassword: string
    sendEmail: boolean
    forcePasswordChange: boolean
    requireMfa: boolean
    sessionTimeout: string
  }
  onChange: (field: string, value: string | boolean) => void
  onGenerate: () => void
  error?: string
  isEdit?: boolean
}

export default function SecuritySection({ values, onChange, onGenerate, error, isEdit = false }: SecuritySectionProps) {
  const copyPassword = async () => {
    if (values.temporaryPassword) await navigator.clipboard?.writeText(values.temporaryPassword)
  }

  return (
    <section className="settings-card">
      <h2>Security</h2>
      <div className="security-grid">
        <div className="password-box">
          <p className="security-managed-note">{isEdit ? 'Only an administrator can change this user password.' : 'A fixed password is generated automatically and can only be changed by an administrator.'}</p>
          <button className="secondary-button" type="button" onClick={onGenerate}><KeyRound size={16} /> {isEdit ? 'Generate replacement password' : 'Regenerate fixed password'}</button>
          <div className="generated-password">
            <input type="text" readOnly={!isEdit} value={values.temporaryPassword} onChange={event => onChange('temporaryPassword', event.target.value)} placeholder={isEdit ? 'Leave blank to keep current password' : 'Managed password'} />
            <button type="button" onClick={copyPassword} aria-label="Copy managed password"><Copy size={16} /></button>
          </div>
          {error && <small className="settings-field-error">{error}</small>}
        </div>
        <div className="settings-checks">
          <label><input type="checkbox" checked={values.sendEmail} onChange={event => onChange('sendEmail', event.target.checked)} /> Send via email to the user</label>
          <label><input type="checkbox" checked={values.forcePasswordChange} onChange={event => onChange('forcePasswordChange', event.target.checked)} /> Force password change on first login</label>
          <label className="toggle-line"><input type="checkbox" checked={values.requireMfa} onChange={event => onChange('requireMfa', event.target.checked)} /> Require MFA on next login</label>
        </div>
        <label className="settings-field">
          <span>Session policy</span>
          <select value={values.sessionTimeout} onChange={event => onChange('sessionTimeout', event.target.value)}>
            <option value="30">Session timeout - 30 min</option>
            <option value="60">Session timeout - 1 hour</option>
            <option value="240">Session timeout - 4 hours</option>
            <option value="480">Session timeout - 8 hours</option>
          </select>
        </label>
      </div>
    </section>
  )
}
