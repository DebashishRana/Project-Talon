import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CountrySelector, { countries } from '../../components/upload/CountrySelector'
import DocumentTypeSelector from '../../components/upload/DocumentTypeSelector'
import { newSessionStore, useNewSessionStore } from '../../store/newSessionStore'
import { UploadCard } from './UploadRouter'

function DocumentTypeStep({ step }) {
  const navigate = useNavigate()
  const session = useNewSessionStore()
  const [documentType, setDocumentType] = useState(session.documentType)
  const [country, setCountry] = useState(session.documentCountry || countries[0])

  const continueFlow = () => {
    newSessionStore.setDocument(documentType, country)
    navigate('/upload/prepare')
  }

  return (
    <UploadCard
      step={step}
      title="Choose your verification document"
      subtitle="You must carry an official government ID"
      backTo="/upload/authorize"
      footer={<button className="upload-primary" type="button" disabled={!documentType || !country} onClick={continueFlow}>Continue</button>}
    >
      <DocumentTypeSelector value={documentType} onChange={setDocumentType} />
      <div className="country-block">
        <span>COUNTRY OF DOCUMENT</span>
        <CountrySelector value={country} onChange={setCountry} />
      </div>
      <p className="upload-note">ⓘ Your information is only used for identity verification</p>
    </UploadCard>
  )
}

export default DocumentTypeStep
