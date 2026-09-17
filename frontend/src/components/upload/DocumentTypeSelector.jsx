import React from 'react'

export const documentTypes = [
  { id: 'PASSPORT', label: 'Passport', icon: '▣', requiresBack: true },
  { id: 'VISA', label: 'Visa', icon: '▤', requiresBack: false },
  { id: 'NATIONAL_ID', label: 'National ID', icon: '▥', requiresBack: true },
  { id: 'AADHAAR_PAN', label: 'Aadhaar / PAN', icon: '◉', requiresBack: true }
]

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
          <span className="document-type-icon">{type.icon}</span>
          <strong>{type.label}</strong>
          <i aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export default DocumentTypeSelector
