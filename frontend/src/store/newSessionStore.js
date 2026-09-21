import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'talon_new_session_v1'
const listeners = new Set()

const initialState = {
  officerId: null,
  officerEmail: '',
  officerVerifiedAt: null,
  checkpointId: '',
  checkpointName: '',
  checkpointStateCode: '',
  rememberDevice: false,
  documentType: null,
  documentCountry: { code: 'IN', iso3: 'IND', name: 'India' },
  documentFrontFile: null,
  documentBackFile: null,
  documentFrontBase64: null,
  documentBackBase64: null,
  pdfContainsAllPages: false,
  captureMethod: null,
  captureSide: 'front',
  liveFaceBase64: null,
  capturedAt: null,
  processingResult: null,
  documentAnalysis: null,
  savedSessionId: null
}

let volatileFiles = {
  documentFrontFile: null,
  documentBackFile: null
}

function serializable(state) {
  const { documentFrontFile, documentBackFile, ...rest } = state
  return rest
}

function readState() {
  if (typeof window === 'undefined') return initialState
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return initialState
    return { ...initialState, ...JSON.parse(stored), ...volatileFiles }
  } catch {
    return initialState
  }
}

let state = readState()

function persist() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable(state)))
  }
}

function emit() {
  persist()
  listeners.forEach(listener => listener())
}

function update(patch) {
  state = { ...state, ...patch }
  volatileFiles = {
    documentFrontFile: state.documentFrontFile,
    documentBackFile: state.documentBackFile
  }
  emit()
}

export const newSessionStore = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    return state
  },
  setOfficer({ officerId, officerEmail, rememberDevice = false, checkpoint }) {
    update({
      officerId,
      officerEmail,
      checkpointId: checkpoint?.id || '',
      checkpointName: checkpoint?.name || '',
      checkpointStateCode: checkpoint?.stateCode || '',
      rememberDevice,
      officerVerifiedAt: new Date().toISOString()
    })
  },
  setDocument(documentType, documentCountry) {
    update({ documentType, documentCountry, pdfContainsAllPages: false, documentAnalysis: null, processingResult: null, savedSessionId: null })
  },
  setDocumentFiles({ frontFile, backFile, frontBase64, backBase64, captureMethod }) {
    const nextFrontBase64 = frontBase64 ?? state.documentFrontBase64
    const nextIsPdf = String(nextFrontBase64 || '').startsWith('data:application/pdf')
    const nextPdfContainsAllPages = frontBase64 !== undefined
      ? false
      : nextIsPdf ? state.pdfContainsAllPages : false
    update({
      documentFrontFile: frontFile ?? state.documentFrontFile,
      documentBackFile: backFile ?? state.documentBackFile,
      documentFrontBase64: nextFrontBase64,
      documentBackBase64: backBase64 ?? state.documentBackBase64,
      pdfContainsAllPages: nextPdfContainsAllPages,
      documentAnalysis: null,
      processingResult: null,
      savedSessionId: null,
      captureMethod: captureMethod ?? state.captureMethod,
      capturedAt: new Date().toISOString()
    })
  },
  setCaptureSide(captureSide) {
    update({ captureSide })
  },
  setPdfContainsAllPages(pdfContainsAllPages) {
    update({ pdfContainsAllPages, documentAnalysis: null, processingResult: null, savedSessionId: null })
  },
  setLiveFace(liveFaceBase64) {
    update({ liveFaceBase64, capturedAt: new Date().toISOString() })
  },
  setProcessingResult(processingResult) {
    update({ processingResult })
  },
  setDocumentAnalysis(documentAnalysis) {
    update({ documentAnalysis })
  },
  setSavedSessionId(savedSessionId) {
    update({ savedSessionId })
  },
  reset() {
    volatileFiles = { documentFrontFile: null, documentBackFile: null }
    state = initialState
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY)
    listeners.forEach(listener => listener())
  }
}

export function useNewSessionStore(selector = value => value) {
  return useSyncExternalStore(
    newSessionStore.subscribe,
    () => selector(newSessionStore.getSnapshot()),
    () => selector(initialState)
  )
}
