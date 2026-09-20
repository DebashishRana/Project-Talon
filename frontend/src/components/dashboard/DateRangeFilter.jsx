import React from 'react'
import { CalendarDays } from 'lucide-react'

const ranges = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' }
]

export default function DateRangeFilter({ range, startDate, endDate, onChange }) {
  return (
    <div className="vd-date-filter" aria-label="Dashboard date range">
      <label>
        <span className="sr-only">Preset range</span>
        <select value={range} onChange={event => onChange({ range: event.target.value, page: 1 })}>
          {ranges.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="vd-date-input">
        <CalendarDays size={14} />
        <span className="sr-only">Start date</span>
        <input type="date" value={startDate} disabled={range !== 'custom'} onChange={event => onChange({ startDate: event.target.value, range: 'custom', page: 1 })} />
      </label>
      <label className="vd-date-input">
        <span className="sr-only">End date</span>
        <input type="date" value={endDate} disabled={range !== 'custom'} onChange={event => onChange({ endDate: event.target.value, range: 'custom', page: 1 })} />
      </label>
    </div>
  )
}
