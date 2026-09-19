import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { blankPermissions } from '../../data/defaultRoles'
import PermissionMatrix from '../../components/settings/PermissionMatrix'
import BottomActionBar from '../../components/settings/BottomActionBar'
import { useRBACStore } from '../../store/rbacStore'
import type { DataScope, ModulePermissions } from '../../types/rbac'
import { writeAuditEvent } from '../../utils/auditLogger'
import './SettingsPages.css'

const roleSchema = z.object({
  name: z.string().min(3, 'Role name is required.'),
  description: z.string().min(8, 'Description is required.'),
  dataScope: z.enum(['own', 'checkpoint', 'organization', 'all'])
})

export default function CreateRolePage({ edit = false }: { edit?: boolean }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const roles = useRBACStore(state => state.roles)
  const addRole = useRBACStore(state => state.addRole)
  const updateRole = useRBACStore(state => state.updateRole)
  const currentRole = roles.find(role => role.id === id)
  const [values, setValues] = useState({
    name: currentRole?.name || '',
    description: currentRole?.description || '',
    dataScope: (currentRole?.dataScope || 'organization') as DataScope
  })
  const [permissions, setPermissions] = useState<ModulePermissions[]>(currentRole?.permissions || blankPermissions())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  const setField = (field: string, value: string) => {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: '' }))
  }

  const save = () => {
    const parsed = roleSchema.safeParse(values)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      parsed.error.issues.forEach(issue => { nextErrors[String(issue.path[0])] = issue.message })
      setErrors(nextErrors)
      return
    }

    if (edit && currentRole && !currentRole.isSystem) {
      updateRole(currentRole.id, { ...values, permissions })
      writeAuditEvent({ type: 'role.updated', targetId: currentRole.id, message: `Updated role ${values.name}` })
      setToast(`Role updated - ${values.name}`)
    } else {
      const role = addRole({ ...values, isSystem: false, permissions })
      writeAuditEvent({ type: 'role.created', targetId: role.id, message: `Created role ${role.name}` })
      setToast(`Role created - ${role.name}`)
    }
    window.setTimeout(() => navigate('/settings/roles'), 650)
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Settings / Role Definitions / {edit ? 'Edit role' : 'Create role'}</p>
        <header className="settings-header"><div><h1>{edit ? 'Edit role' : 'Create custom role'}</h1></div></header>
        <section className="settings-card">
          <h2>Role Details</h2>
          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Role name <b>*</b></span>
              <input value={values.name} onChange={event => setField('name', event.target.value)} placeholder="Senior Field Supervisor" />
              {errors.name && <small>{errors.name}</small>}
            </label>
            <label className="settings-field">
              <span>Data scope <b>*</b></span>
              <select value={values.dataScope} onChange={event => setField('dataScope', event.target.value)}>
                <option value="own">Own sessions only</option>
                <option value="checkpoint">Checkpoint-level</option>
                <option value="organization">Organization-level</option>
                <option value="all">All organizations</option>
              </select>
              {errors.dataScope && <small>{errors.dataScope}</small>}
            </label>
            <label className="settings-field" style={{ gridColumn: '1 / -1' }}>
              <span>Description <b>*</b></span>
              <textarea rows={3} value={values.description} onChange={event => setField('description', event.target.value)} placeholder="Short text explaining this role's purpose" />
              {errors.description && <small>{errors.description}</small>}
            </label>
          </div>
        </section>
        <section className="settings-card">
          <h2>Permission Matrix</h2>
          <PermissionMatrix value={permissions} onChange={setPermissions} />
        </section>
      </div>
      <BottomActionBar backTo="/settings/roles" onSave={save} saveLabel={edit ? 'Save role' : 'Save role'} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
