import React from 'react'

function EmptyState({ filtered, onClearFilters, onNewSession }) {
  return (
    <div className="vl-empty-state">
      <div className="vl-empty-icon" aria-hidden="true">{filtered ? '⌕' : '▧'}</div>
      <h2>{filtered ? 'No sessions match your filters' : 'No verification sessions yet'}</h2>
      <p>
        {filtered
          ? 'Try adjusting your search or filters.'
          : 'Start a screening session to see it appear here. Each session captures the subject, document, and all six evidence signals.'}
      </p>
      <button className={filtered ? 'vl-button secondary' : 'vl-button primary'} type="button" onClick={filtered ? onClearFilters : onNewSession}>
        {filtered ? 'Clear filters' : 'Start new session'}
      </button>
    </div>
  )
}

export default EmptyState
