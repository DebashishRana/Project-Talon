import React, { useEffect, useRef, useState } from 'react'

function SearchInput({ value, onChange }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    const timeout = window.setTimeout(() => onChange(draft), 300)
    return () => window.clearTimeout(timeout)
  }, [draft, onChange])

  useEffect(() => {
    const handleKey = event => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <label className="vl-search">
      <span aria-hidden="true">⌕</span>
      <input
        ref={inputRef}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        placeholder="Search by session ID, masked name, face reference, or document number"
      />
    </label>
  )
}

export default SearchInput
