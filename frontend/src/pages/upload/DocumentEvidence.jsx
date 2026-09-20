import React from 'react'
import { FileSearch, ScanText, ScanLine } from 'lucide-react'
import { subjectFields } from '../../utils/documentAnalysis'

const labels = { passport_number: 'Passport number', date_of_birth: 'Date of birth', expiration_date: 'Expiry date', issuing_country: 'Issuing country', nationality: 'Nationality', surname: 'Surname', given_names: 'Given names', sex: 'Sex' }

function EvidenceCard({ icon: Icon, title, status, summary, children }) {
  return (
    <article className="document-evidence-card">
      <div className="document-evidence-icon"><Icon size={19} /></div>
      <div className="document-evidence-body">
        <div className="document-evidence-heading"><strong>{title}</strong><span data-status={status}>{status.replaceAll('_', ' ')}</span></div>
        <p>{summary}</p>
        {children}
      </div>
    </article>
  )
}

export default function DocumentEvidence({ analysis }) {
  if (!analysis) return <p className="evidence-empty">Document analysis is pending.</p>
  const { metadata = {}, classifier = {}, mrz } = analysis
  const fields = subjectFields(analysis)
  const passport = classifier.models?.passport
  const passportProbability = passport ? (passport.expected ? passport.confidence : 1 - passport.confidence) : null
  const extracted = Object.entries(fields).filter(([, value]) => Boolean(value))
  const classifierStatus = passport?.status === 'model'
    ? (passport.expected ? 'DETECTED' : 'REVIEW')
    : passport?.status === 'fallback_ocr' ? 'FALLBACK_OCR' : 'NOT_RUN'
  const ocrIssue = metadata.ocr_error || metadata.error
  return (
    <div className="document-evidence-list">
      <EvidenceCard icon={FileSearch} title="Passport classifier" status={classifierStatus} summary={passport ? `${passport.reason || `Passport probability: ${(passportProbability * 100).toFixed(1)}%.`} Combined document type: ${classifier.document_type || 'Unknown'}.` : 'Classifier result was not returned.'}>
        {classifier.models?.aadhaar && <small>Aadhaar model: {classifier.models.aadhaar.status.replaceAll('_', ' ')}</small>}
      </EvidenceCard>
      <EvidenceCard icon={ScanText} title="OCR extraction" status={ocrIssue ? 'REVIEW' : metadata.extracted_text?.trim() ? 'EXTRACTED' : 'NOT_FOUND'} summary={ocrIssue || (metadata.extracted_text?.trim() ? `${extracted.length} structured fields available from OCR and MRZ.` : 'No readable text was extracted.') }>
        {extracted.length > 0 && <dl className="evidence-fields">{extracted.map(([key, value]) => <div key={key}><dt>{labels[key] || key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl>}
        {metadata.extracted_text?.trim() && <details><summary>Full OCR text</summary><pre>{metadata.extracted_text}</pre></details>}
      </EvidenceCard>
      <EvidenceCard icon={ScanLine} title="MRZ validation" status={!mrz ? 'NOT_APPLICABLE' : mrz.detected ? mrz.status.toUpperCase() : 'NOT_FOUND'} summary={!mrz ? 'MRZ parsing applies to passport documents here.' : mrz.detected ? `${mrz.format} machine readable zone. ${mrz.issues.length ? mrz.issues.map(issue => issue.replaceAll('_', ' ')).join(', ') : 'All parsed checks passed.'}` : 'No passport MRZ was found in the OCR text.'}>
        {mrz?.detected && <>
          <dl className="evidence-fields">{Object.entries(mrz.parsed || {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{labels[key] || key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl>
          <details><summary>MRZ lines and checks</summary><pre>{mrz.lines.join('\n')}</pre><p>Check digits: {Object.entries(mrz.check_digits || {}).map(([key, value]) => `${key}: ${value ?? '-'}`).join(' | ')}</p></details>
        </>}
      </EvidenceCard>
    </div>
  )
}
