import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import CheckpointPicker from './CheckpointPicker'

interface GeneralInfoSectionProps {
  values: {
    fullName: string
    email: string
    checkpointId: string
    phone: string
    roleId?: string
  }
  errors: Record<string, string>
  showCheckpoint: boolean
  onChange: (field: string, value: string) => void
}

export function isGovernmentEmail(email: string) {
  return /@(ssb\.gov\.in|mha\.gov\.in)$/i.test(email.trim())
}

export default function GeneralInfoSection({ values, errors, showCheckpoint, onChange }: GeneralInfoSectionProps) {
  const emailValid = isGovernmentEmail(values.email)

  return (
    <section className="settings-card">
      <h2>General Info</h2>
      <div className="settings-form-grid">
        <label className="settings-field">
          <span>Full name <b>*</b></span>
          <input value={values.fullName} onChange={event => onChange('fullName', event.target.value)} placeholder="e.g., Officer A. Sharma" />
          {errors.fullName && <small>{errors.fullName}</small>}
        </label>
        <label className="settings-field">
          <span>Email <b>*</b></span>
          <div className="input-with-icon">
            <input value={values.email} onChange={event => onChange('email', event.target.value)} placeholder="officer.sharma@ssb.gov.in" />
            {emailValid && <CheckCircle2 size={17} />}
          </div>
          {errors.email && <small>{errors.email}</small>}
        </label>
        {showCheckpoint && (
          <CheckpointPicker value={values.checkpointId} onChange={(value: string) => onChange('checkpointId', value)} error={errors.checkpointId} />
        )}
        <label className="settings-field">
          <span>Phone number</span>
          <input value={values.phone} onChange={event => onChange('phone', event.target.value)} placeholder="+91 XXXXX XXXXX" />
          {errors.phone && <small>{errors.phone}</small>}
        </label>
      </div>
    </section>
  )
}
