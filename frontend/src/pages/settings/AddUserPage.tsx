import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Info } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { blankPermissions } from '../../data/defaultRoles'
import { useRBACStore } from '../../store/rbacStore'
import { useCheckpointStore } from '../../store/checkpointStore'
import { resolveCheckpoint } from '../../data/checkpoints'
import type { ModulePermissions } from '../../types/rbac'
import { writeAuditEvent } from '../../utils/auditLogger'
import { generateSecurePassword } from '../../utils/passwordGenerator'
import { hashPassword, normalizeEmail } from '../../utils/authCredentials'
import BottomActionBar from '../../components/settings/BottomActionBar'
import GeneralInfoSection, { isGovernmentEmail } from '../../components/settings/GeneralInfoSection'
import PermissionMatrix from '../../components/settings/PermissionMatrix'
import RoleTabSwitcher from '../../components/settings/RoleTabSwitcher'
import SecuritySection from '../../components/settings/SecuritySection'
import './SettingsPages.css'

const userSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  email: z.string().email('Enter a valid email.').refine(isGovernmentEmail, 'Use an approved government domain.'),
  phone: z.string().optional(),
  checkpointId: z.string().optional()
})

const customRoleSchema = z.object({
  name: z.string().min(3, 'Role name is required.'),
  description: z.string().min(8, 'Role description is required.')
})

const initialSecurity = {
  temporaryPassword: '',
  sendEmail: true,
  forcePasswordChange: true,
  requireMfa: false,
  sessionTimeout: '60'
}

export default function AddUserPage({ edit = false }: { edit?: boolean }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const roles = useRBACStore(state => state.roles)
  const addRole = useRBACStore(state => state.addRole)
  const addUser = useRBACStore(state => state.addUser)
  const updateUser = useRBACStore(state => state.updateUser)
  const users = useRBACStore(state => state.users)
  const existingUser = useRBACStore(state => edit && id ? state.getUserById(id) : undefined)
  const existingRole = roles.find(role => role.id === existingUser?.roleId)
  const [mode, setMode] = useState<'default' | 'custom'>('default')
  const [roleId, setRoleId] = useState(existingUser?.roleId || 'operative')
  const [customRole, setCustomRole] = useState({ name: '', description: '' })
  const [permissions, setPermissions] = useState<ModulePermissions[]>(existingRole?.permissions || blankPermissions())
  const [security, setSecurity] = useState({ ...initialSecurity, requireMfa: roleId === 'super_admin', sessionTimeout: roleId === 'super_admin' ? '30' : '60' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const { register, getValues, setValue } = useForm({
    defaultValues: {
      fullName: existingUser?.fullName || '',
      email: existingUser?.email || '',
      checkpointId: existingUser?.checkpointId || '',
      phone: existingUser?.phone || ''
    }
  })

  const values = getValues()
  const selectedRole = roles.find(role => role.id === roleId) || roles[0]
  const showCheckpoint = mode === 'default' ? roleId === 'operative' || selectedRole?.dataScope === 'checkpoint' : customRole.name.toLowerCase().includes('operative')
  const effectivePermissions = useMemo(() => mode === 'default' ? (selectedRole?.permissions || blankPermissions()) : permissions, [mode, selectedRole, permissions])

  const updateField = (field: string, value: string) => {
    setValue(field as never, value as never, { shouldDirty: true })
    setErrors(current => ({ ...current, [field]: '' }))
  }

  const chooseRole = (nextRoleId: string) => {
    setRoleId(nextRoleId)
    const role = roles.find(item => item.id === nextRoleId)
    if (role) {
      setPermissions(role.permissions)
      setSecurity(current => ({
        ...current,
        requireMfa: nextRoleId === 'super_admin',
        sessionTimeout: nextRoleId === 'super_admin' ? '30' : '60'
      }))
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const parsedUser = userSchema.safeParse(getValues())
    if (!parsedUser.success) {
      parsedUser.error.issues.forEach(issue => { nextErrors[String(issue.path[0])] = issue.message })
    }
    if (showCheckpoint && !resolveCheckpoint(getValues().checkpointId, useCheckpointStore.getState().checkpoints)) nextErrors.checkpointId = 'Select a checkpoint from the directory.'
    if (!edit && security.temporaryPassword.length < 8) nextErrors.temporaryPassword = 'Set a temporary password with at least 8 characters.'
    if (!edit && users.some(user => normalizeEmail(user.email) === normalizeEmail(getValues().email))) nextErrors.email = 'An account already exists for this email address.'
    if (mode === 'custom') {
      const parsedRole = customRoleSchema.safeParse(customRole)
      if (!parsedRole.success) parsedRole.error.issues.forEach(issue => { nextErrors[`role_${String(issue.path[0])}`] = issue.message })
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const save = async () => {
    if (!validate()) return
    let finalRoleId = roleId
    let finalRoleName = selectedRole?.name || 'Custom role'
    if (mode === 'custom') {
      const role = addRole({
        name: customRole.name,
        description: customRole.description,
        isSystem: false,
        dataScope: 'organization',
        permissions
      })
      finalRoleId = role.id
      finalRoleName = role.name
      writeAuditEvent({ type: 'role.created', targetId: role.id, message: `Created role ${role.name}`, metadata: { role } })
    }
    const formValues = getValues()
    if (edit && existingUser) {
      const roleChanged = existingUser.roleId !== finalRoleId
      updateUser(existingUser.id, {
        fullName: formValues.fullName,
        email: formValues.email,
        roleId: finalRoleId,
        checkpointId: formValues.checkpointId || undefined,
        phone: formValues.phone || undefined
      })
      writeAuditEvent({ type: roleChanged ? 'user.role_changed' : 'user.updated', targetId: existingUser.id, message: `Updated user ${formValues.fullName}` })
      setToast(`User updated - ${formValues.fullName} saved`)
    } else {
      const passwordHash = await hashPassword(security.temporaryPassword)
      const user = addUser({
        fullName: formValues.fullName,
        email: formValues.email,
        roleId: finalRoleId,
        checkpointId: formValues.checkpointId || undefined,
        phone: formValues.phone || undefined,
        status: 'ACTIVE',
        passwordHash,
        forcePasswordChange: security.forcePasswordChange,
        requireMfa: security.requireMfa,
        sessionTimeoutMinutes: Number(security.sessionTimeout)
      })
      writeAuditEvent({
        type: 'user.created',
        targetId: user.id,
        message: `Created user ${user.fullName}`,
        metadata: {
          roleId: finalRoleId,
          forcePasswordChange: security.forcePasswordChange,
          requireMfa: security.requireMfa,
          sessionTimeout: security.sessionTimeout
        }
      })
      setToast(`User created - ${user.fullName} added as ${finalRoleName}`)
    }
    window.setTimeout(() => navigate('/settings/users'), 650)
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Settings / User & access / {edit ? 'Edit user' : 'Add user'}</p>
        <header className="settings-header"><div><h1>{edit ? 'Edit user' : 'Add user'}</h1></div></header>
        <input type="hidden" {...register('fullName')} />
        <input type="hidden" {...register('email')} />
        <input type="hidden" {...register('checkpointId')} />
        <input type="hidden" {...register('phone')} />

        <GeneralInfoSection values={values} errors={errors} showCheckpoint={showCheckpoint} onChange={updateField} />

        <section className="settings-card">
          <h2>Role &amp; access</h2>
          {!edit && <RoleTabSwitcher value={mode} onChange={setMode} />}
          {mode === 'default' && (
            <div className="role-card-grid">
              {roles.filter(role => role.isSystem).map(role => (
                <button className={`role-card ${roleId === role.id ? 'active' : ''}`} type="button" key={role.id} onClick={() => chooseRole(role.id)}>
                  <strong>{role.name}</strong>
                  <p>{role.description}</p>
                  <span>{role.permissions.filter(row => row.read).length} readable modules</span>
                </button>
              ))}
            </div>
          )}
          {mode === 'custom' && (
            <div className="settings-form-grid">
              <label className="settings-field">
                <span>Role name <b>*</b></span>
                <input value={customRole.name} onChange={event => setCustomRole(value => ({ ...value, name: event.target.value }))} placeholder="Senior Field Supervisor" />
                {errors.role_name && <small>{errors.role_name}</small>}
              </label>
              <label className="settings-field">
                <span>Role description <b>*</b></span>
                <input value={customRole.description} onChange={event => setCustomRole(value => ({ ...value, description: event.target.value }))} placeholder="Supervises checkpoint screening activity" />
                {errors.role_description && <small>{errors.role_description}</small>}
              </label>
            </div>
          )}
        </section>

        <section className="settings-card">
          <h2>Permission Matrix</h2>
          <PermissionMatrix value={effectivePermissions} onChange={setPermissions} disabled={mode === 'default'} />
        </section>

        <SecuritySection
          values={security}
          onChange={(field, value) => setSecurity(current => ({ ...current, [field]: value }))}
          onGenerate={() => setSecurity(current => ({ ...current, temporaryPassword: generateSecurePassword() }))}
          error={errors.temporaryPassword}
        />
        <p className="audit-note"><Info size={14} /> This user creation will be logged in the audit trail. The user will receive an email with setup instructions.</p>
      </div>
      <BottomActionBar backTo="/settings/users" onSave={save} saveLabel={edit ? 'Save changes' : 'Save'} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
