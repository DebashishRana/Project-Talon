import React from 'react'
import { documentTypes } from '../../data/documentTypes'

function DocumentIcon({ type }) {
  return (
    <span className="document-type-icon">
      {type.iconFile && (
        <img
          src={`/icons/doc%20types/${encodeURIComponent(type.iconFile)}`}
          alt=""
          onError={event => {
            event.currentTarget.hidden = true
            event.currentTarget.nextElementSibling.hidden = false
          }}
        />
      )}
      <span className="document-type-fallback" hidden={Boolean(type.iconFile)}>{type.icon}</span>
    </span>
  )
}

function DocumentTypeSelector({ value, onChange }) {
  return (
    <div className="document-type-list">
      {documentTypes.map(type => (
        <button
          className={`document-type-card ${value === type.id ? 'selected' : ''}`}
          type="button"
          key={type.id}
          onClick={() => onChange(type.id)}
        >
          <DocumentIcon type={type} />
          <strong>{type.label}</strong>
          <i aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export default DocumentTypeSelector
