import React, { useId, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { INDIA_STATES, canManageCheckpoints, resolveCheckpoint } from '../../data/checkpoints'
import { useCheckpointStore } from '../../store/checkpointStore'
import { useRBACStore } from '../../store/rbacStore'
import './CheckpointPicker.css'

export function AddCheckpointForm({ onCreated, onCancel, initialStateCode = '' }) {
  const [name, setName] = useState('')
  const [stateCode, setStateCode] = useState(initialStateCode)
  const [error, setError] = useState('')
  const addCheckpoint = useCheckpointStore(state => state.addCheckpoint)
  const save = () => {
    try {
      const checkpoint = addCheckpoint({ name, stateCode })
      onCreated(checkpoint)
    } catch (error) { setError(error.message) }
  }
  return <div className="checkpoint-create" role="group" aria-label="New checkpoint">
    <label>Checkpoint name<input value={name} maxLength={80} onChange={event => setName(event.target.value)} autoFocus /></label>
    <label>State<select value={stateCode} onChange={event => setStateCode(event.target.value)}>
      <option value="">Select state</option>
      {INDIA_STATES.map(state => <option key={state.code} value={state.code}>{state.name} - {state.capital}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}
    <div className="checkpoint-create-actions">
      <button type="button" onClick={onCancel}><X size={15} /> Cancel</button>
      <button type="button" className="checkpoint-save" onClick={save}><Save size={15} /> Save checkpoint</button>
    </div>
  </div>
}

export default function CheckpointPicker({ value = '', onChange, error, disabled = false, required = true }) {
  const id = useId()
  const checkpoints = useCheckpointStore(state => state.checkpoints)
  const user = useRBACStore(state => state.users.find(item => item.id === state.currentUserId))
  const role = useRBACStore(state => state.roles.find(item => item.id === user?.roleId))
  const [adding, setAdding] = useState(false)
  const selected = resolveCheckpoint(value, checkpoints)
  return <div className="checkpoint-picker">
    <label htmlFor={id}>Checkpoint {required && <b>*</b>}</label>
    <div className="checkpoint-picker-control">
      <select id={id} value={selected?.id || value} onChange={event => onChange(event.target.value)} disabled={disabled} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
        <option value="">Select checkpoint</option>
        {value && !selected && <option value={value}>{value} (unmapped)</option>}
        {INDIA_STATES.map(state => <optgroup key={state.code} label={state.name}>
          {checkpoints.filter(item => item.stateCode === state.code).sort((a, b) => a.name.localeCompare(b.name)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </optgroup>)}
      </select>
      {!disabled && canManageCheckpoints(user, role) && <button type="button" aria-label="Add custom checkpoint" title="Add custom checkpoint" onClick={() => setAdding(true)}><Plus size={18} /></button>}
    </div>
    {error && <small id={`${id}-error`} role="alert">{error}</small>}
    {adding && <AddCheckpointForm onCancel={() => setAdding(false)} onCreated={checkpoint => { onChange(checkpoint.id); setAdding(false) }} />}
  </div>
}
