import React from 'react'

export const documentTypes = [
  { id: 'PASSPORT', label: 'Passport', icon: 'P', iconFile: 'passport.webp', requiresBack: true },
  { id: 'VISA', label: 'Visa', icon: 'V', iconFile: 'visa.webp', requiresBack: false },
  { id: 'NATIONAL_ID', label: 'National ID', icon: 'ID', iconFile: 'national-id.webp', requiresBack: true },
  { id: 'AADHAAR_PAN', label: 'Aadhaar / PAN', icon: 'A', iconFile: 'aadhaar-pan.webp', requiresBack: true }
]

function DocumentIcon({ type }) {
  return (
    <span className="document-type-icon">
      {type.iconFile && (
        <img
          src={`/icons/${type.iconFile}`}
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
