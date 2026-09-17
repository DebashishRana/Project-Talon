import React, { useMemo, useState } from 'react'

const countries = [
  { code: 'IN', iso3: 'IND', name: 'India' },
  { code: 'NP', iso3: 'NPL', name: 'Nepal' },
  { code: 'BD', iso3: 'BGD', name: 'Bangladesh' },
  { code: 'BT', iso3: 'BTN', name: 'Bhutan' },
  { code: 'LK', iso3: 'LKA', name: 'Sri Lanka' },
  { code: 'MV', iso3: 'MDV', name: 'Maldives' },
  { code: 'MM', iso3: 'MMR', name: 'Myanmar' },
  { code: 'US', iso3: 'USA', name: 'United States' },
  { code: 'GB', iso3: 'GBR', name: 'United Kingdom' },
  { code: 'AE', iso3: 'ARE', name: 'United Arab Emirates' }
]

export function flagEmoji(code) {
  return String(code || 'IN').toUpperCase().replace(/./g, char =>
    String.fromCodePoint(127397 + char.charCodeAt())
  )
}

function CountrySelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = value || countries[0]
  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return countries
    return countries.filter(country =>
      country.name.toLowerCase().includes(needle) ||
      country.code.toLowerCase().includes(needle) ||
      country.iso3.toLowerCase().includes(needle)
    )
  }, [query])

  return (
    <div className="country-selector">
      <button className="country-trigger" type="button" onClick={() => setOpen(value => !value)}>
        <span>{flagEmoji(selected.code)}</span>
        <strong>{selected.name}</strong>
        <i>⌄</i>
      </button>
      {open && (
        <div className="country-menu">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search country" autoFocus />
          {filtered.map(country => (
            <button
              type="button"
              key={country.code}
              onClick={() => {
                onChange(country)
                setOpen(false)
                setQuery('')
              }}
            >
              <span>{flagEmoji(country.code)}</span>
              <strong>{country.name}</strong>
              <small>{country.iso3}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CountrySelector
