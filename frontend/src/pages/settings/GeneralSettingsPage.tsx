import React from 'react'
import { Link } from 'react-router-dom'
import './SettingsPages.css'

export default function GeneralSettingsPage() {
  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Settings</p>
        <header className="settings-header">
          <div>
            <h1>General Settings</h1>
            <p>Configure TALON platform preferences and administrative controls.</p>
          </div>
          <div className="settings-actions">
            <Link className="secondary-button" to="/settings/users">User & Access</Link>
            <Link className="secondary-button" to="/settings/roles">Role Definitions</Link>
          </div>
        </header>
        <section className="settings-placeholder">General settings, sessions and devices, and audit configuration can plug into this protected settings area.</section>
      </div>
    </div>
  )
}
