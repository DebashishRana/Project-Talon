import React from 'react'
import './settings/SettingsPages.css'

export default function WorkspacePlaceholderPage({ title, description }) {
  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Workspace</p>
        <header className="settings-header">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        <section className="settings-placeholder">This workspace section is ready for its dedicated tools.</section>
      </div>
    </div>
  )
}
