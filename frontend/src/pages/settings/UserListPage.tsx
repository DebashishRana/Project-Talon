import React, { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MoreHorizontal, Plus, UserX } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRBACStore } from '../../store/rbacStore'
import { useCheckpointStore } from '../../store/checkpointStore'
import { resolveCheckpoint } from '../../data/checkpoints'
import { writeAuditEvent } from '../../utils/auditLogger'
import { generateSecurePassword } from '../../utils/passwordGenerator'
import { hashPassword } from '../../utils/authCredentials'
import './SettingsPages.css'

const statuses = ['ACTIVE', 'SUSPENDED', 'PENDING']

export default function UserListPage() {
  const users = useRBACStore(state => state.users)
  const roles = useRBACStore(state => state.roles)
  const currentUserId = useRBACStore(state => state.currentUserId)
  const updateUser = useRBACStore(state => state.updateUser)
  const deleteUser = useRBACStore(state => state.deleteUser)
  const [query, setQuery] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('')
  const [checkpoint, setCheckpoint] = useState('')
  const location = useLocation()
  const [credentialNotice, setCredentialNotice] = useState<{ fullName: string; email: string; password: string } | null>(() => location.state?.credential || null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const checkpointDirectory = useCheckpointStore(state => state.checkpoints)
  const checkpointKey = (value?: string) => resolveCheckpoint(value, checkpointDirectory)?.id || value
  const checkpointLabel = (value?: string) => resolveCheckpoint(value, checkpointDirectory)?.name || value || '-'

  const roleById = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles])
  const checkpoints = Array.from(new Set(users.map(user => checkpointKey(user.checkpointId)).filter(Boolean))) as string[]

  const filteredUsers = users.filter(user => {
    const text = `${user.fullName} ${user.email}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase())) &&
      (!roleId || user.roleId === roleId) &&
      (!status || user.status === status) &&
      (!checkpoint || checkpointKey(user.checkpointId) === checkpoint)
  })

  const toggleStatus = (userId: string) => {
    const user = users.find(item => item.id === userId)
    if (!user) return
    const nextStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    updateUser(userId, { status: nextStatus })
    writeAuditEvent({
      type: nextStatus === 'SUSPENDED' ? 'user.suspended' : 'user.updated',
      targetId: userId,
      message: `${nextStatus === 'SUSPENDED' ? 'Suspended' : 'Activated'} user ${user.fullName}`
    })
  }

  const removeUser = (userId: string) => {
    const user = users.find(item => item.id === userId)
    if (!user || user.id === currentUserId) return
    deleteUser(userId)
    writeAuditEvent({ type: 'user.deleted', targetId: userId, message: `Deleted user ${user.fullName}` })
  }

  const resetPassword = async (userId: string) => {
    const user = users.find(item => item.id === userId)
    if (!user) return
    const password = generateSecurePassword()
    updateUser(userId, { passwordHash: await hashPassword(password), forcePasswordChange: false })
    writeAuditEvent({ type: 'password.reset', targetId: userId, message: `Changed managed password for ${user.fullName}` })
    setCredentialNotice({ fullName: user.fullName, email: user.email, password })
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Settings / User &amp; access</p>
        <header className="settings-header">
          <div>
            <h1>User &amp; Access</h1>
            <p>Manage users and assign roles across your organization.</p>
          </div>
          <div className="settings-actions">
            <Link className="primary-button" to="/settings/users/new"><Plus size={16} /> Add user</Link>
            <Link className="secondary-button" to="/settings/roles">Manage roles</Link>
          </div>
        </header>

        {credentialNotice && (
          <section className="credential-notice" role="status">
            <div>
              <strong>Managed credentials ready</strong>
              <p>Share this password securely with {credentialNotice.fullName}. It is stored for this account and can only be replaced by an administrator.</p>
              <dl><div><dt>Email</dt><dd>{credentialNotice.email}</dd></div><div><dt>Password</dt><dd>{credentialNotice.password}</dd></div></dl>
            </div>
            <button type="button" onClick={() => navigator.clipboard?.writeText(credentialNotice.password)}>Copy password</button>
            <button type="button" className="credential-dismiss" onClick={() => setCredentialNotice(null)} aria-label="Dismiss credential notice">Dismiss</button>
          </section>
        )}

        <div className="filter-bar">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or email" />
          <select value={roleId} onChange={event => setRoleId(event.target.value)}>
            <option value="">All roles</option>
            {roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}
          </select>
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(item => <option value={item} key={item}>{item}</option>)}
          </select>
          <select value={checkpoint} onChange={event => setCheckpoint(event.target.value)}>
            <option value="">All checkpoints</option>
            {checkpoints.map(item => <option value={item} key={item}>{checkpointLabel(item)}</option>)}
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th><input ref={selectAllRef} type="checkbox" aria-label="Select all users" /></th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Checkpoint</th>
              <th>Status</th>
              <th>Last login</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const role = roleById.get(user.roleId)
              return (
                <tr key={user.id}>
                  <td><input type="checkbox" aria-label={`Select ${user.fullName}`} /></td>
                  <td className="name-cell"><strong>{user.fullName}</strong><small>{user.id === currentUserId ? 'Current account' : user.id}</small></td>
                  <td>{user.email}</td>
                  <td>{role?.name || 'Unknown role'}</td>
                  <td>{checkpointLabel(user.checkpointId)}</td>
                  <td><span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td>{user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : '-'}</td>
                  <td>
                    <details className="row-menu">
                      <summary><MoreHorizontal size={18} /></summary>
                      <div>
                        <Link to={`/settings/users/${user.id}`}>Edit user</Link>
                        <button type="button" onClick={() => resetPassword(user.id)}>Change managed password</button>
                        <button type="button" onClick={() => toggleStatus(user.id)}>{user.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}</button>
                        <button type="button" onClick={() => writeAuditEvent({ type: 'user.updated', targetId: user.id, message: `Viewed audit trail for ${user.fullName}` })}>View audit trail</button>
                        <button className="danger" type="button" disabled={user.id === currentUserId} onClick={() => removeUser(user.id)}>Delete</button>
                      </div>
                    </details>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <section className="empty-state">
            <UserX size={42} />
            <h2>No users found</h2>
            <p>Try adjusting your search or add a new user.</p>
            <Link className="primary-button" to="/settings/users/new"><Plus size={16} /> Add user</Link>
          </section>
        )}
      </div>
    </div>
  )
}
