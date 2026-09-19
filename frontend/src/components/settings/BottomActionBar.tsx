import React from 'react'
import { Link } from 'react-router-dom'

interface BottomActionBarProps {
  backTo: string
  saving?: boolean
  saveLabel?: string
  disabled?: boolean
  onSave: () => void
}

export default function BottomActionBar({ backTo, saving, saveLabel = 'Save', disabled, onSave }: BottomActionBarProps) {
  return (
    <div className="bottom-action-bar">
      <Link to={backTo}>Back</Link>
      <div>
        <Link className="cancel-button" to={backTo}>Cancel</Link>
        <button className="save-button" type="button" disabled={disabled || saving} onClick={onSave}>{saving ? 'Saving...' : saveLabel}</button>
      </div>
    </div>
  )
}
