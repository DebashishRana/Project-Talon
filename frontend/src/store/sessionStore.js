import { useSyncExternalStore } from 'react'
import { clearSessionMedia, deleteSessionMedia, loadSessionMedia, MEDIA_FIELDS, saveSessionMedia } from '../utils/sessionMediaStore'

const STORAGE_KEY = 'talon_sessions_v1'
const MAX_PERSISTED_SESSIONS = 50
const MEDIA_FIELD_SET = new Set(MEDIA_FIELDS)
const listeners = new Set()

const emptyState = { sessions: [] }
let state = readState()

function hydrateMedia() {
  if (!state.sessions.length) return
  Promise.all(state.sessions.map(async session => ({
    id: session.id,
    media: await loadSessionMedia(session.id)
  }))).then(entries => {
    const mediaById = new Map(entries.map(entry => [entry.id, entry.media]))
    const hydrated = state.sessions.map(session => ({ ...session, ...(mediaById.get(session.id) || {}) }))
    if (JSON.stringify(hydrated) === JSON.stringify(state.sessions)) return
    state = { sessions: hydrated }
    emit()
  })
}

hydrateMedia()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    state = readState()
    listeners.forEach(listener => listener())
  })
}

function readState() {
  if (typeof window === 'undefined') return emptyState
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return emptyState
    const parsed = JSON.parse(stored)
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] }
  } catch {
    return emptyState
  }
}

function persist(nextState = state) {
  if (typeof window === 'undefined') return
  const sessions = nextState.sessions
    .slice(0, MAX_PERSISTED_SESSIONS)
    .map(session => Object.fromEntries(
      Object.entries(session).filter(([key]) => !MEDIA_FIELD_SET.has(key))
    ))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }))
  } catch {
    // The live state remains usable when browser storage is unavailable or full.
  }
}

function emit() {
  listeners.forEach(listener => listener())
}

function setSessions(updater) {
  const nextState = { sessions: updater(state.sessions) }
  persist(nextState)
  state = nextState
  emit()
}

function makeSessionId(date = new Date(), sequence = state.sessions.length + 1) {
  const stamp = date.toISOString().slice(0, 10).replaceAll('-', '')
  const sameDayCount = state.sessions.filter(session => session.id.includes(`TALON-${stamp}`)).length
  return `TALON-${stamp}-${String(Math.max(sequence, sameDayCount + 1)).padStart(3, '0')}`
}

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function isInDateRange(iso, range = {}) {
  if (!range.from && !range.to) return true
  const value = new Date(iso).getTime()
  if (range.from) {
    const from = new Date(range.from)
    from.setHours(0, 0, 0, 0)
    if (value < from.getTime()) return false
  }
  if (range.to) {
    const to = new Date(range.to)
    to.setHours(23, 59, 59, 999)
    if (value > to.getTime()) return false
  }
  return true
}

export function filterSessions(sessions, filters) {
  const query = normalizeText(filters.searchQuery).trim()
  return sessions.filter(session => {
    const queryMatch = !query || [
      session.id,
      session.subjectNameMasked,
      session.faceHash,
      session.documentNumberMasked,
      session.officerName,
      session.checkpointName
    ].some(value => normalizeText(value).includes(query))

    return queryMatch &&
      (!filters.statuses?.length || filters.statuses.includes(session.status)) &&
      (!filters.riskLevels?.length || filters.riskLevels.includes(session.riskLevel)) &&
      (!filters.documentTypes?.length || filters.documentTypes.includes(session.documentType)) &&
      (!filters.officerIds?.length || filters.officerIds.includes(session.officerId)) &&
      (!filters.checkpointIds?.length || filters.checkpointIds.includes(session.checkpointId)) &&
      (!filters.csiiStatus?.length || filters.csiiStatus.includes(session.csiiStatus)) &&
      isInDateRange(session.createdAt, filters.dateRange)
  })
}

export const sessionStore = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    return state
  },
  addSession(sessionInput) {
    const now = new Date()
    const session = {
      ...sessionInput,
      id: makeSessionId(now),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
    setSessions(sessions => [session, ...sessions])
    void saveSessionMedia(session)
    return session
  },
  updateSession(id, patch) {
    const updated = state.sessions.map(session => (
      session.id === id ? { ...session, ...patch, id: session.id, updatedAt: new Date().toISOString() } : session
    ))
    setSessions(() => updated)
    const session = updated.find(item => item.id === id)
    if (session) void saveSessionMedia(session)
  },
  deleteSession(id) {
    setSessions(sessions => sessions.filter(session => session.id !== id))
    void deleteSessionMedia(id)
  },
  clearAll() {
    setSessions(() => [])
    void clearSessionMedia()
  },
  getSessionById(id) {
    return state.sessions.find(session => session.id === id)
  },
  getFilteredSessions(filters) {
    return filterSessions(state.sessions, filters)
  },
  getCounts() {
    return {
      total: state.sessions.length,
      awaitingReview: state.sessions.filter(session => ['FLAGGED', 'MANUAL_REVIEW'].includes(session.status)).length,
      verified: state.sessions.filter(session => session.status === 'VERIFIED').length,
      flagged: state.sessions.filter(session => session.status === 'FLAGGED').length,
      rejected: state.sessions.filter(session => session.status === 'REJECTED').length
    }
  }
}

export function useSessionStore(selector = value => value) {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selector(sessionStore.getSnapshot()),
    () => selector(emptyState)
  )
}
