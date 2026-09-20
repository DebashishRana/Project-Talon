import api from './api'
import { analyzeMRZ } from '@talon-mrz'

function isPdfDataUrl(value) {
  return String(value || '').startsWith('data:application/pdf')
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return response.blob()
}

function extensionForBlob(blob) {
  if (blob.type === 'image/webp') return 'webp'
  if (blob.type === 'image/png') return 'png'
  if (blob.type === 'application/pdf') return 'pdf'
  return 'jpg'
}

function apiErrorMessage(error) {
  const detail = error.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map(item => {
      const path = Array.isArray(item.loc) ? item.loc.join('.') : item.loc
      return `${path || 'request'}: ${item.msg || 'invalid value'}`
    }).join('; ')
  }
  if (typeof detail === 'string') return detail
  return error.message || 'Document analysis failed.'
}

function findMRZText(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.replace(/\s+/g, '').toUpperCase())
  const start = lines.findIndex((line, index) => /^[PIACDXEM]</.test(line) && line.length >= 30 && lines[index + 1]?.length >= 30)
  return start >= 0 ? lines.slice(start, start + 2).join('\n') : ''
}

export async function analyzeUploadedDocument(session) {
  const dataUrl = session.documentFrontBase64
  if (!dataUrl) throw new Error('Upload a document image before analysis.')

  const form = new FormData()
  const frontBlob = await dataUrlToBlob(dataUrl)
  const frontFilename = session.documentFrontFile?.name || `document-front.${extensionForBlob(frontBlob)}`
  form.append('files', frontBlob, frontFilename)

  const shouldSendBack = Boolean(session.documentBackBase64 && !(isPdfDataUrl(dataUrl) && session.pdfContainsAllPages))
  if (shouldSendBack) {
    const backBlob = await dataUrlToBlob(session.documentBackBase64)
    const backFilename = session.documentBackFile?.name || `document-back.${extensionForBlob(backBlob)}`
    form.append('files', backBlob, backFilename)
  }

  let data
  try {
    const response = await api.post('/api/process-documents', form)
    data = response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }

  const results = Array.isArray(data.results) ? data.results : []
  const result = results.find(item => item?.success) || results[0]
  if (!result?.success) throw new Error(result?.error || 'Document analysis returned no result.')

  const successfulResults = results.filter(item => item?.success)
  const combinedText = successfulResults
    .map(item => item.metadata?.extracted_text)
    .filter(Boolean)
    .join('\n')
  const metadata = {
    ...(result.metadata || {}),
    extracted_text: combinedText || result.metadata?.extracted_text || ''
  }
  const mrz = session.documentType === 'PASSPORT'
    ? analyzeMRZ(findMRZText(metadata.extracted_text))
    : null

  return {
    filename: frontFilename,
    files: results.map(item => ({
      filename: item.filename,
      success: Boolean(item.success),
      error: item.error,
      documentType: item.document_type,
      verified: item.verified
    })),
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
