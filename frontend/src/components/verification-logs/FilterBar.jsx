import React, { useMemo } from 'react'

const statuses = ['PENDING', 'PROCESSING', 'VERIFIED', 'FLAGGED', 'MANUAL_REVIEW', 'REJECTED', 'CANCELLED']
const risks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const csiiStatuses = ['OFF', 'ON', 'MONITORING']
const documentTypes = ['PASSPORT', 'VISA', 'AADHAAR', 'PAN', 'DRIVING_LICENSE', 'NATIONAL_PERMIT', 'PERMIT']

function title(value) {
  return String(value).replaceAll('_', ' ')
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

function MultiSelect({ label, values, selected, onChange, getLabel = title }) {
  return (
    <details className={`vl-filter ${selected.length ? 'active' : ''}`}>
      <summary>{label}{selected.length ? ` (${selected.length})` : ''}</summary>
      <div className="vl-filter-menu">
        {values.length ? values.map(value => (
          <label key={value.id || value}>
            <input
              type="checkbox"
              checked={selected.includes(value.id || value)}
              onChange={() => onChange(toggleValue(selected, value.id || value))}
            />
            <span>{getLabel(value)}</span>
          </label>
        )) : <small>No values yet</small>}
      </div>
    </details>
  )
}

function FilterBar({ filters, sessions, onFiltersChange, onReset }) {
  const options = useMemo(() => {
    const by = (idKey, labelKey) => Array.from(new Map(sessions.map(session => [
      session[idKey],
      { id: session[idKey], label: session[labelKey] }
    ])).values()).filter(item => item.id)

    return {
      subjects: Array.from(new Set(sessions.map(session => session.subjectNameMasked).filter(Boolean))),
      officers: by('officerId', 'officerName'),
      checkpoints: by('checkpointId', 'checkpointName')
    }
  }, [sessions])

  const hasAnyActive = Boolean(
    filters.searchQuery ||
    filters.statuses.length ||
    filters.riskLevels.length ||
    filters.documentTypes.length ||
    filters.officerIds.length ||
    filters.checkpointIds.length ||
    filters.csiiStatus.length ||
    filters.dateRange.from ||
    filters.dateRange.to
  )

  const update = patch => onFiltersChange({ ...filters, ...patch })

  return (
    <div className="vl-filter-row" aria-label="Verification filters">
      <button className="vl-filter-button" type="button" onClick={hasAnyActive ? onReset : () => update({
        statuses: [...statuses],
        riskLevels: [...risks],
        documentTypes: [...documentTypes],
        csiiStatus: [...csiiStatuses],
        officerIds: options.officers.map(item => item.id),
        checkpointIds: options.checkpoints.map(item => item.id)
      })}>{hasAnyActive ? 'All' : 'Select all'}</button>
      <MultiSelect label="Subject" values={options.subjects} selected={filters.subjects || []} onChange={subjects => update({ subjects })} />
      <MultiSelect label="Pipeline" values={documentTypes} selected={filters.documentTypes} onChange={documentTypes => update({ documentTypes })} />
      <MultiSelect label="Status" values={statuses} selected={filters.statuses} onChange={statuses => update({ statuses })} />
      <MultiSelect label="Risk" values={risks} selected={filters.riskLevels} onChange={riskLevels => update({ riskLevels })} />
      <MultiSelect label="Officer" values={options.officers} selected={filters.officerIds} onChange={officerIds => update({ officerIds })} getLabel={item => item.label} />
      <MultiSelect label="Checkpoint" values={options.checkpoints} selected={filters.checkpointIds} onChange={checkpointIds => update({ checkpointIds })} getLabel={item => item.label} />
      <MultiSelect label="CSII" values={csiiStatuses} selected={filters.csiiStatus} onChange={csiiStatus => update({ csiiStatus })} />
      <details className={`vl-filter ${(filters.dateRange.from || filters.dateRange.to) ? 'active' : ''}`}>
        <summary>Created at{(filters.dateRange.from || filters.dateRange.to) ? ' (1)' : ''}</summary>
        <div className="vl-filter-menu date-menu">
          <label>From<input type="date" value={filters.dateRange.from || ''} onChange={event => update({ dateRange: { ...filters.dateRange, from: event.target.value } })} /></label>
          <label>To<input type="date" value={filters.dateRange.to || ''} onChange={event => update({ dateRange: { ...filters.dateRange, to: event.target.value } })} /></label>
        </div>
      </details>
      <button className="vl-reset-link" type="button" onClick={onReset}>Reset</button>
    </div>
  )
}

export default FilterBar
