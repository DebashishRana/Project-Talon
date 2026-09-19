import React from 'react'

interface RoleTabSwitcherProps {
  value: 'default' | 'custom'
  onChange: (value: 'default' | 'custom') => void
}

export default function RoleTabSwitcher({ value, onChange }: RoleTabSwitcherProps) {
  return (
    <div className="role-tabs" role="tablist" aria-label="Role selection mode">
      <button className={value === 'default' ? 'active' : ''} type="button" onClick={() => onChange('default')}>Default role</button>
      <button className={value === 'custom' ? 'active' : ''} type="button" onClick={() => onChange('custom')}>Custom role</button>
    </div>
  )
}
