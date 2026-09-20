import React, { Fragment, useMemo, useState } from 'react'

const mostUsedCountries = [
  { code: 'IN', iso3: 'IND', name: 'India' },
  { code: 'PK', iso3: 'PAK', name: 'Pakistan' },
  { code: 'CN', iso3: 'CHN', name: 'China' },
  { code: 'NP', iso3: 'NPL', name: 'Nepal' },
  { code: 'BT', iso3: 'BTN', name: 'Bhutan' },
  { code: 'LK', iso3: 'LKA', name: 'Sri Lanka' },
  { code: 'AF', iso3: 'AFG', name: 'Afghanistan' },
  { code: 'BD', iso3: 'BGD', name: 'Bangladesh' },
  { code: 'MM', iso3: 'MMR', name: 'Myanmar' },
  { code: 'MV', iso3: 'MDV', name: 'Maldives' }
]

const continentSections = [
  {
    title: 'Asia',
    countries: [
      { code: 'AE', iso3: 'ARE', name: 'United Arab Emirates' },
      { code: 'SA', iso3: 'SAU', name: 'Saudi Arabia' },
      { code: 'QA', iso3: 'QAT', name: 'Qatar' },
      { code: 'KW', iso3: 'KWT', name: 'Kuwait' },
      { code: 'OM', iso3: 'OMN', name: 'Oman' },
      { code: 'BH', iso3: 'BHR', name: 'Bahrain' },
      { code: 'IR', iso3: 'IRN', name: 'Iran' },
      { code: 'IQ', iso3: 'IRQ', name: 'Iraq' },
      { code: 'IL', iso3: 'ISR', name: 'Israel' },
      { code: 'JO', iso3: 'JOR', name: 'Jordan' },
      { code: 'TR', iso3: 'TUR', name: 'Turkey' },
      { code: 'JP', iso3: 'JPN', name: 'Japan' },
      { code: 'KR', iso3: 'KOR', name: 'South Korea' },
      { code: 'SG', iso3: 'SGP', name: 'Singapore' },
      { code: 'MY', iso3: 'MYS', name: 'Malaysia' },
      { code: 'TH', iso3: 'THA', name: 'Thailand' },
      { code: 'ID', iso3: 'IDN', name: 'Indonesia' },
      { code: 'PH', iso3: 'PHL', name: 'Philippines' },
      { code: 'VN', iso3: 'VNM', name: 'Vietnam' }
    ]
  },
  {
    title: 'Europe',
    countries: [
      { code: 'GB', iso3: 'GBR', name: 'United Kingdom' },
      { code: 'FR', iso3: 'FRA', name: 'France' },
      { code: 'DE', iso3: 'DEU', name: 'Germany' },
      { code: 'IT', iso3: 'ITA', name: 'Italy' },
      { code: 'ES', iso3: 'ESP', name: 'Spain' },
      { code: 'NL', iso3: 'NLD', name: 'Netherlands' },
      { code: 'BE', iso3: 'BEL', name: 'Belgium' },
      { code: 'CH', iso3: 'CHE', name: 'Switzerland' },
      { code: 'AT', iso3: 'AUT', name: 'Austria' },
      { code: 'SE', iso3: 'SWE', name: 'Sweden' },
      { code: 'NO', iso3: 'NOR', name: 'Norway' },
      { code: 'DK', iso3: 'DNK', name: 'Denmark' },
      { code: 'FI', iso3: 'FIN', name: 'Finland' },
      { code: 'IE', iso3: 'IRL', name: 'Ireland' },
      { code: 'PT', iso3: 'PRT', name: 'Portugal' },
      { code: 'GR', iso3: 'GRC', name: 'Greece' },
      { code: 'PL', iso3: 'POL', name: 'Poland' },
      { code: 'CZ', iso3: 'CZE', name: 'Czechia' },
      { code: 'HU', iso3: 'HUN', name: 'Hungary' },
      { code: 'RO', iso3: 'ROU', name: 'Romania' },
      { code: 'UA', iso3: 'UKR', name: 'Ukraine' },
      { code: 'RU', iso3: 'RUS', name: 'Russia' }
    ]
  },
  {
    title: 'Africa',
    countries: [
      { code: 'ZA', iso3: 'ZAF', name: 'South Africa' },
      { code: 'EG', iso3: 'EGY', name: 'Egypt' },
      { code: 'KE', iso3: 'KEN', name: 'Kenya' },
      { code: 'NG', iso3: 'NGA', name: 'Nigeria' },
      { code: 'ET', iso3: 'ETH', name: 'Ethiopia' },
      { code: 'TZ', iso3: 'TZA', name: 'Tanzania' },
      { code: 'UG', iso3: 'UGA', name: 'Uganda' },
      { code: 'RW', iso3: 'RWA', name: 'Rwanda' },
      { code: 'MA', iso3: 'MAR', name: 'Morocco' },
      { code: 'DZ', iso3: 'DZA', name: 'Algeria' },
      { code: 'GH', iso3: 'GHA', name: 'Ghana' }
    ]
  },
  {
    title: 'North America',
    countries: [
      { code: 'US', iso3: 'USA', name: 'United States' },
      { code: 'CA', iso3: 'CAN', name: 'Canada' },
      { code: 'MX', iso3: 'MEX', name: 'Mexico' },
      { code: 'CU', iso3: 'CUB', name: 'Cuba' },
      { code: 'JM', iso3: 'JAM', name: 'Jamaica' },
      { code: 'DO', iso3: 'DOM', name: 'Dominican Republic' },
      { code: 'HT', iso3: 'HTI', name: 'Haiti' },
      { code: 'PA', iso3: 'PAN', name: 'Panama' },
      { code: 'CR', iso3: 'CRI', name: 'Costa Rica' }
    ]
  },
  {
    title: 'South America',
    countries: [
      { code: 'BR', iso3: 'BRA', name: 'Brazil' },
      { code: 'AR', iso3: 'ARG', name: 'Argentina' },
      { code: 'CL', iso3: 'CHL', name: 'Chile' },
      { code: 'CO', iso3: 'COL', name: 'Colombia' },
      { code: 'PE', iso3: 'PER', name: 'Peru' },
      { code: 'VE', iso3: 'VEN', name: 'Venezuela' },
      { code: 'UY', iso3: 'URY', name: 'Uruguay' },
      { code: 'EC', iso3: 'ECU', name: 'Ecuador' },
      { code: 'BO', iso3: 'BOL', name: 'Bolivia' }
    ]
  },
  {
    title: 'Oceania',
    countries: [
      { code: 'AU', iso3: 'AUS', name: 'Australia' },
      { code: 'NZ', iso3: 'NZL', name: 'New Zealand' },
      { code: 'FJ', iso3: 'FJI', name: 'Fiji' },
      { code: 'PG', iso3: 'PNG', name: 'Papua New Guinea' }
    ]
  }
]

export const countrySections = [
  { title: 'Most used', countries: mostUsedCountries },
  ...continentSections
]

export const countries = countrySections
  .flatMap(section => section.countries)
  .filter((country, index, allCountries) => (
    allCountries.findIndex(candidate => candidate.code === country.code) === index
  ))

export function flagEmoji(code) {
  return String(code || 'IN').toUpperCase().replace(/./g, char =>
    String.fromCodePoint(127397 + char.charCodeAt())
  )
}

function CountryFlag({ country }) {
  return (
    <span className="country-flag" aria-hidden="true">
      <img
        src={`/icons/flags/${country.code.toLowerCase()}.webp`}
        alt=""
        onError={event => {
          event.currentTarget.hidden = true
          event.currentTarget.nextElementSibling.hidden = false
        }}
      />
      <span className="country-flag-fallback" hidden>{flagEmoji(country.code)}</span>
    </span>
  )
}

function CountryButton({ country, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(country)}>
      <CountryFlag country={country} />
      <strong>{country.name}</strong>
      <small>{country.iso3}</small>
    </button>
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

  const selectCountry = country => {
    onChange(country)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="country-selector">
      <button className="country-trigger" type="button" onClick={() => setOpen(value => !value)}>
        <CountryFlag country={selected} />
        <strong>{selected.name}</strong>
        <i>v</i>
      </button>
      {open && (
        <div className="country-menu">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search country" autoFocus />
          {query.trim() ? (
            filtered.map(country => (
              <CountryButton country={country} key={country.code} onSelect={selectCountry} />
            ))
          ) : (
            countrySections.map(section => (
              <Fragment key={section.title}>
                <div className="country-menu-heading">{section.title}</div>
                {section.countries.map(country => (
                  <CountryButton country={country} key={`${section.title}-${country.code}`} onSelect={selectCountry} />
                ))}
              </Fragment>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default CountrySelector
