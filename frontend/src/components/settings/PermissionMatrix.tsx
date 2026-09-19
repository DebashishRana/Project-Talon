import React, { useEffect, useMemo, useRef } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Box,
  FileBarChart,
  FileText,
  History,
  LayoutDashboard,
  MonitorSmartphone,
  Network,
  Plug,
  ScanLine,
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react'
import { MODULES } from '../../data/defaultRoles'
import type { ModuleKey, ModulePermissions, Permission } from '../../types/rbac'

const actionLabels: Permission[] = ['create', 'read', 'update', 'delete']

const moduleIcons: Record<ModuleKey, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard,
  sessions: ScanLine,
  flagged_cases: AlertTriangle,
  csii_graph: Network,
  verification_logs: FileText,
  audit_trail: History,
  reports: FileBarChart,
  analytics: BarChart3,
  user_access: Users,
  role_definitions: ShieldCheck,
  devices: MonitorSmartphone,
  model_registry: Box,
  settings: Settings,
  integrations: Plug
}

interface HeaderCheckboxProps {
  action: Permission
  permissions: ModulePermissions[]
  disabled?: boolean
  onToggle: (action: Permission) => void
}

function HeaderCheckbox({ action, permissions, disabled, onToggle }: HeaderCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  const checkedCount = permissions.filter(row => row[action]).length
  const allChecked = checkedCount === permissions.length
  const indeterminate = checkedCount > 0 && checkedCount < permissions.length

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className="pm-header-check">
      <input
        ref={ref}
        type="checkbox"
        checked={allChecked}
        disabled={disabled}
        onChange={() => onToggle(action)}
      />
      <span>{action}</span>
    </label>
  )
}

interface PermissionMatrixProps {
  value: ModulePermissions[]
  onChange: (permissions: ModulePermissions[]) => void
  disabled?: boolean
}

export default function PermissionMatrix({ value, onChange, disabled = false }: PermissionMatrixProps) {
  const permissions = useMemo(() => {
    const existing = new Map(value.map(row => [row.module, row]))
    return MODULES.map(({ key }) => existing.get(key) || {
      module: key,
      create: false,
      read: false,
      update: false,
      delete: false
    })
  }, [value])

  const updateRow = (module: ModuleKey, patch: Partial<ModulePermissions>) => {
    if (disabled) return
    onChange(permissions.map(row => row.module === module ? { ...row, ...patch } : row))
  }

  const toggleAction = (module: ModuleKey, action: Permission) => {
    const row = permissions.find(item => item.module === module)
    if (!row) return
    updateRow(module, { [action]: !row[action] })
  }

  const toggleRow = (module: ModuleKey) => {
    const row = permissions.find(item => item.module === module)
    if (!row) return
    const shouldSelect = actionLabels.some(action => !row[action])
    updateRow(module, {
      create: shouldSelect,
      read: shouldSelect,
      update: shouldSelect,
      delete: shouldSelect
    })
  }

  const toggleColumn = (action: Permission) => {
    if (disabled) return
    const shouldSelect = permissions.some(row => !row[action])
    onChange(permissions.map(row => ({ ...row, [action]: shouldSelect })))
  }

  return (
    <div className="permission-matrix">
      <div className="pm-table">
        <div className="pm-row pm-head">
          <div>Module</div>
          {actionLabels.map(action => (
            <div className="pm-action-head" key={action}>
              <HeaderCheckbox action={action} permissions={permissions} disabled={disabled} onToggle={toggleColumn} />
            </div>
          ))}
        </div>
        {permissions.map((row, index) => {
          const Icon = moduleIcons[row.module]
          const rowChecked = actionLabels.every(action => row[action])
          const label = MODULES.find(item => item.key === row.module)?.label || row.module
          return (
            <div className={`pm-row ${index % 2 === 0 ? 'alt' : ''}`} key={row.module}>
              <div className="pm-module-cell">
                <input type="checkbox" checked={rowChecked} disabled={disabled} onChange={() => toggleRow(row.module)} />
                <Icon size={17} />
                <span>{label}</span>
              </div>
              {actionLabels.map(action => (
                <label className="pm-check-cell" key={action}>
                  <input
                    type="checkbox"
                    checked={row[action]}
                    disabled={disabled}
                    onChange={() => toggleAction(row.module, action)}
                    aria-label={`${label} ${action}`}
                  />
                </label>
              ))}
            </div>
          )
        })}
      </div>
      <p className="matrix-note">Super Admin and other system-defined roles have fixed permissions. Custom roles can be freely configured.</p>
    </div>
  )
}
