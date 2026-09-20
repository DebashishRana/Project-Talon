import api from './api'
import { analyzeMRZ } from '@talon-mrz'

function findMRZText(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.replace(/\s+/g, '').toUpperCase())
  const start = lines.findIndex((line, index) => /^[PIACDXEM]</.test(line) && line.length >= 30 && lines[index + 1]?.length >= 30)
  return start >= 0 ? lines.slice(start, start + 2).join('\n') : ''
}

export async function analyzeUploadedDocument(session) {
  const dataUrl = session.documentFrontBase64
  if (!dataUrl) throw new Error('Upload a document image before analysis.')

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : blob.type === 'application/pdf' ? 'pdf' : 'jpg'
  const filename = session.documentFrontFile?.name || `document-front.${extension}`
  const form = new FormData()
  form.append('files', blob, filename)
  const { data } = await api.post('/api/process-documents', form)
  const result = data.results?.[0]
  if (!result?.success) throw new Error(result?.error || 'Document analysis returned no result.')

  const metadata = result.metadata || {}
  const mrz = session.documentType === 'PASSPORT'
    ? analyzeMRZ(findMRZText(metadata.extracted_text))
    : null

  return {
    filename,
    metadata,
    classifier: result.model_result || {},
    mrz,
    forensics: { status: 'NOT_RUN', detail: 'A tampering detector is not connected to this processing service.' },
    analyzedAt: new Date().toISOString()
  }
}

export function subjectFields(analysis) {
  const metadata = analysis?.metadata || {}
  const parsed = analysis?.mrz?.parsed || {}
  return {
    name: metadata.holder_name || metadata.full_name || metadata.name || [parsed.given_names, parsed.surname].filter(Boolean).join(' ') || '',
    dob: metadata.date_of_birth || parsed.birth_date || '',
    documentNumber: metadata.passport_number || metadata.pan_numbers?.[0] || parsed.passport_number || '',
    nationality: metadata.nationality || parsed.nationality || ''
  }
}
