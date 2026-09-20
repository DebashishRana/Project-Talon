import React from 'react'
import { AlertCircle, SearchX } from 'lucide-react'

export function ErrorState({ message, onRetry }) {
  return (
    <section className="vd-state-message error">
      <AlertCircle size={22} />
      <div>
        <strong>Dashboard data could not load</strong>
        <p>{message || 'Please try again.'}</p>
      </div>
      <button type="button" onClick={onRetry}>Retry</button>
    </section>
  )
}

export function EmptyState({ title = 'No verification records found.', body = 'Try changing the search, filters, or date range.' }) {
  return (
    <section className="vd-state-message empty">
      <SearchX size={24} />
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  )
}
