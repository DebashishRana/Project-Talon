import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BulkActionsBar from '../components/verification-logs/BulkActionsBar'
import EmptyState from '../components/verification-logs/EmptyState'
import FilterBar from '../components/verification-logs/FilterBar'
import ReviewBanner from '../components/verification-logs/ReviewBanner'
import SearchInput from '../components/verification-logs/SearchInput'
import SessionDetailDrawer from '../components/verification-logs/SessionDetailDrawer'
import SessionRow from '../components/verification-logs/SessionRow'
import { exportSessionsCsv } from '../utils/csvExport'
import { filterSessions, sessionStore, useSessionStore } from '../store/sessionStore'
import { maskEmail } from '../utils/masking'
import './VerificationLogs.css'

const currentOfficer = {
  id: 'officer.sharma@ssb.gov.in',
  name: 'A. Sharma',
  email: 'officer.sharma@ssb.gov.in'
}

const emptyFilters = {
  searchQuery: '',
  statuses: [],
  riskLevels: [],
  documentTypes: [],
  officerIds: [],
  checkpointIds: [],
  dateRange: {},
  csiiStatus: [],
  subjects: []
}

function pluralSessions(count) {
  return `${count} session${count === 1 ? '' : 's'}`
}

function applySubjectFilter(sessions, filters) {
  const filtered = filterSessions(sessions, filters)
  if (!filters.subjects?.length) return filtered
  return filtered.filter(session => filters.subjects.includes(session.subjectNameMasked))
}

function compareValue(session, key) {
  if (key === 'SESSION') return session.id
  if (key === 'STATUS') return session.status
  if (key === 'RISK') return session.riskScore
  return new Date(session.createdAt).getTime()
}

function VerificationLogs() {
  const navigate = useNavigate()
  const sessions = useSessionStore(state => state.sessions)
  const [filters, setFilters] = useState(emptyFilters)
  const [selectedIds, setSelectedIds] = useState([])
  const [drawerSession, setDrawerSession] = useState(null)
  const [sort, setSort] = useState({ key: 'CREATED_AT', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [contextMenu, setContextMenu] = useState(null)
  const selectAllRef = useRef(null)

  const counts = sessionStore.getCounts()
  const activeFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters)

  const filteredSessions = useMemo(() => {
    const rows = applySubjectFilter(sessions, filters)
    return [...rows].sort((a, b) => {
      const left = compareValue(a, sort.key)
      const right = compareValue(b, sort.key)
      const result = left > right ? 1 : left < right ? -1 : 0
      return sort.direction === 'asc' ? result : -result
    })
  }, [sessions, filters, sort])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / 25))
  const pageSessions = filteredSessions.slice((page - 1) * 25, page * 25)
  const selectedSessions = sessions.filter(session => selectedIds.includes(session.id))
  const allVisibleSelected = pageSessions.length > 0 && pageSessions.every(session => selectedIds.includes(session.id))
  const someVisibleSelected = pageSessions.some(session => selectedIds.includes(session.id))

  useEffect(() => setPage(1), [filters, sort])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [someVisibleSelected, allVisibleSelected])

  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'n' && document.activeElement?.tagName !== 'INPUT') navigate('/upload')
      if (event.key === 'Escape') {
        if (drawerSession) setDrawerSession(null)
        else if (filters.searchQuery) setFilters(value => ({ ...value, searchQuery: '' }))
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate, drawerSession, filters.searchQuery])

  useEffect(() => {
    const interval = window.setInterval(() => {
      sessionStore.getSnapshot().sessions.forEach(session => {
        if (!['PENDING', 'PROCESSING'].includes(session.status)) return
        const age = Date.now() - new Date(session.createdAt).getTime()
        if (session.status === 'PENDING' && age > 5000) sessionStore.updateSession(session.id, { status: 'PROCESSING' })
        if (session.status === 'PROCESSING' && age > 15000) sessionStore.updateSession(session.id, { status: 'VERIFIED', riskLevel: 'LOW', riskScore: Math.min(session.riskScore, 0.18) })
      })
    }, 5000)
    return () => window.clearInterval(interval)
  }, [])

  const resetFilters = () => setFilters(emptyFilters)

  const toggleSort = key => setSort(value => ({
    key,
    direction: value.key === key && value.direction === 'asc' ? 'desc' : 'asc'
  }))

  const toggleSelect = id => setSelectedIds(value => (
    value.includes(id) ? value.filter(selectedId => selectedId !== id) : [...value, id]
  ))

  const toggleAllVisible = () => setSelectedIds(value => (
    allVisibleSelected
      ? value.filter(id => !pageSessions.some(session => session.id === id))
      : Array.from(new Set([...value, ...pageSessions.map(session => session.id)]))
  ))

  const deleteSelected = () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected session${selectedIds.length === 1 ? '' : 's'}?`)) return
    selectedIds.forEach(id => sessionStore.deleteSession(id))
    setSelectedIds([])
  }

  const openContextMenu = (event, session) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, session })
  }

  const copySessionId = async session => {
    await navigator.clipboard?.writeText(session.id)
    setContextMenu(null)
  }

  const deleteSession = session => {
    if (window.confirm(`Delete ${session.id}?`)) {
      sessionStore.deleteSession(session.id)
      setSelectedIds(value => value.filter(id => id !== session.id))
      if (drawerSession?.id === session.id) setDrawerSession(null)
    }
    setContextMenu(null)
  }

  const showingStart = filteredSessions.length ? (page - 1) * 25 + 1 : 0
  const showingEnd = Math.min(page * 25, filteredSessions.length)

  return (
    <div className="verification-logs-page" onClick={() => setContextMenu(null)}>
      <header className="vl-header">
        <div>
          <h1>Verifications</h1>
          <p>{pluralSessions(counts.total)}</p>
        </div>
        <div className="vl-toolbar">
          <button className="vl-icon-button" type="button" onClick={() => navigate('/upload')} aria-label="New session">+</button>
          <button className="vl-icon-button bell" type="button" aria-label={`${counts.awaitingReview} sessions need review`}>
            ◇{counts.awaitingReview > 0 && <i />}
          </button>
          <details className="vl-user-menu">
            <summary><span>AS</span>{maskEmail(currentOfficer.email)}</summary>
            <button type="button" onClick={() => navigate('/login')}>Logout</button>
          </details>
          <button className="vl-button primary" type="button" onClick={() => navigate('/upload')}>New session</button>
        </div>
      </header>

      <section className="vl-controls">
        <SearchInput value={filters.searchQuery} onChange={searchQuery => setFilters(value => ({ ...value, searchQuery }))} />
        <ReviewBanner count={counts.awaitingReview} onApplyReviewFilter={() => setFilters(value => ({ ...value, statuses: ['FLAGGED', 'MANUAL_REVIEW'] }))} />
        <button className="vl-reset-link" type="button" onClick={resetFilters}>Reset</button>
      </section>

      <FilterBar filters={filters} sessions={sessions} onFiltersChange={setFilters} onReset={resetFilters} />

      <BulkActionsBar
        count={selectedIds.length}
        onExport={() => exportSessionsCsv(selectedSessions)}
        onDelete={deleteSelected}
      />

      <section className="vl-table-shell">
        <div className="vl-table-scroll">
          <table className="vl-table">
            <thead>
              <tr>
                <th className="vl-check-cell"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible sessions" /></th>
                <th><button type="button" onClick={() => toggleSort('SESSION')}>Session</button></th>
                <th className="vl-pipeline-head">Pipeline</th>
                <th><button type="button" onClick={() => toggleSort('STATUS')}>Status</button></th>
                <th><button type="button" onClick={() => toggleSort('RISK')}>Risk</button></th>
                <th className="vl-officer-head">Officer</th>
                <th><button type="button" onClick={() => toggleSort('CREATED_AT')}>Created at</button></th>
                <th>CSII</th>
              </tr>
            </thead>
            <tbody>
              {pageSessions.map(session => (
                <SessionRow
                  key={session.id}
                  session={session}
                  selected={selectedIds.includes(session.id)}
                  onSelect={toggleSelect}
                  onOpen={setDrawerSession}
                  onContextMenu={openContextMenu}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filteredSessions.length === 0 && (
          <EmptyState
            filtered={sessions.length > 0 && activeFilters}
            onClearFilters={resetFilters}
            onNewSession={() => navigate('/upload')}
          />
        )}
        {filteredSessions.length > 0 && (
          <footer className="vl-pagination">
            <span>Showing {showingStart}-{showingEnd} of {filteredSessions.length}</span>
            <div>
              <button type="button" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button className={page === index + 1 ? 'active' : ''} type="button" key={index + 1} onClick={() => setPage(index + 1)}>{index + 1}</button>
              ))}
              <button type="button" disabled={page === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next</button>
            </div>
          </footer>
        )}
      </section>

      {contextMenu && (
        <div className="vl-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event => event.stopPropagation()}>
          <button type="button" onClick={() => { setDrawerSession(contextMenu.session); setContextMenu(null) }}>View details</button>
          <button type="button" onClick={() => copySessionId(contextMenu.session)}>Copy session ID</button>
          <button type="button" onClick={() => { exportSessionsCsv([contextMenu.session], `${contextMenu.session.id}.csv`); setContextMenu(null) }}>Export session</button>
          <button className="danger" type="button" onClick={() => deleteSession(contextMenu.session)}>Delete session</button>
        </div>
      )}

      <SessionDetailDrawer session={drawerSession} onClose={() => setDrawerSession(null)} />
    </div>
  )
}

export default VerificationLogs
