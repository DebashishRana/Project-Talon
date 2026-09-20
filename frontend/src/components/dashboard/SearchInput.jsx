import React from 'react'
import { Search } from 'lucide-react'

export default function SearchInput({ id, value, onChange, placeholder, label = 'Search' }) {
  return (
    <label className="vd-search" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <Search size={15} />
      <input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}
