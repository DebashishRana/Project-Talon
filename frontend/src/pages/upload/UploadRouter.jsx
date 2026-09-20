import React from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ProgressBar from '../../components/upload/ProgressBar'
import { useNewSessionStore } from '../../store/newSessionStore'
import AuthorizeStep from './AuthorizeStep'
import CaptureStep from './CaptureStep'
import CompleteStep from './CompleteStep'
import DocumentTypeStep from './DocumentTypeStep'
import DocumentResultsStep from './DocumentResultsStep'
import FaceStep from './FaceStep'
import PrepareStep from './PrepareStep'
import ProcessingStep from './ProcessingStep'
import './UploadFlow.css'
import './UploadFlowOverrides.css'

const stepMap = {
  '/upload/authorize': 1,
  '/upload/document-type': 2,
  '/upload/prepare': 3,
  '/upload/capture': 3,
  '/upload/document-results': 3,
  '/upload/face': 4,
  '/upload/processing': 5,
  '/upload/complete': 5
}

export function UploadCard({ step, title, subtitle, children, footer, backTo, className = '' }) {
  const navigate = useNavigate()
  return (
    <div className="upload-flow-page">
      <section className={`upload-card ${className}`}>
        <ProgressBar step={step} />
        {backTo && <button className="upload-back" type="button" onClick={() => navigate(backTo)}>‹</button>}
        <header className="upload-card-header">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
        {footer && <div className="upload-card-footer">{footer}</div>}
      </section>
    </div>
  )
}

function RequireStep({ children, needsOfficer, needsDocument, needsDocumentImage, needsDocumentAnalysis, needsFace }) {
  const session = useNewSessionStore()
  if (needsOfficer && !session.officerId) return <Navigate to="/upload/authorize" replace />
  if (needsDocument && !session.documentType) return <Navigate to="/upload/document-type" replace />
  if (needsDocumentImage && !session.documentFrontBase64) return <Navigate to="/upload/prepare" replace />
  if (needsDocumentAnalysis && !session.documentAnalysis) return <Navigate to="/upload/document-results" replace />
  if (needsFace && !session.liveFaceBase64) return <Navigate to="/upload/face" replace />
  return children
}

function UploadRouter() {
  const location = useLocation()
  const step = stepMap[location.pathname] || 1

  return (
    <Routes>
      <Route index element={<Navigate to="authorize" replace />} />
      <Route path="authorize" element={<AuthorizeStep step={step} />} />
      <Route path="document-type" element={<RequireStep needsOfficer><DocumentTypeStep step={step} /></RequireStep>} />
      <Route path="prepare" element={<RequireStep needsOfficer needsDocument><PrepareStep step={step} /></RequireStep>} />
      <Route path="capture" element={<RequireStep needsOfficer needsDocument><CaptureStep /></RequireStep>} />
      <Route path="document-results" element={<RequireStep needsOfficer needsDocument needsDocumentImage><DocumentResultsStep step={step} /></RequireStep>} />
      <Route path="face" element={<RequireStep needsOfficer needsDocument needsDocumentImage needsDocumentAnalysis><FaceStep step={step} /></RequireStep>} />
      <Route path="processing" element={<RequireStep needsOfficer needsDocument needsDocumentImage needsDocumentAnalysis needsFace><ProcessingStep step={step} /></RequireStep>} />
      <Route path="complete" element={<RequireStep needsOfficer needsDocument needsDocumentImage needsDocumentAnalysis needsFace><CompleteStep step={step} /></RequireStep>} />
      <Route path="*" element={<Navigate to="/upload/authorize" replace />} />
    </Routes>
  )
}

export default UploadRouter
