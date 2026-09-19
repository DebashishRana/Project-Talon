import React from 'react'
import { Link } from 'react-router-dom'
import { Lock, MoreHorizontal, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useRBACStore } from '../../store/rbacStore'
import { writeAuditEvent } from '../../utils/auditLogger'
import './SettingsPages.css'

const scopeLabels = {
  own: 'Own sessions',
  checkpoint: 'Checkpoint-level',
  organization: 'Organization',
  all: 'All organizations'
}

export default function RoleListPage() {
  const roles = useRBACStore(state => state.roles)
  const users = useRBACStore(state => state.users)
  const deleteRole = useRBACStore(state => state.deleteRole)
  const addRole = useRBACStore(state => state.addRole)

  const duplicateRole = (roleId: string) => {
    const role = roles.find(item => item.id === roleId)
    if (!role) return
    const duplicate = addRole({
      name: `${role.name} Copy`,
      description: role.description,
      isSystem: false,
      dataScope: role.dataScope,
      permissions: role.permissions
    })
    writeAuditEvent({ type: 'role.created', targetId: duplicate.id, message: `Duplicated role ${role.name}` })
  }

  const removeRole = (roleId: string) => {
    const role = roles.find(item => item.id === roleId)
    if (!role || role.isSystem) return
    deleteRole(roleId)
    writeAuditEvent({ type: 'role.deleted', targetId: roleId, message: `Deleted role ${role.name}` })
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <p className="settings-breadcrumb">Settings / Role Definitions</p>
        <header className="settings-header">
          <div>
            <h1>Role Definitions</h1>
            <p>Manage what each role can do across the platform.</p>
          </div>
          <div className="settings-actions">
            <Link className="primary-button" to="/settings/roles/new"><Plus size={16} /> Create role</Link>
          </div>
        </header>

        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Users assigned</th>
              <th>Data scope</th>
              <th>Last updated</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {roles.map(role => {
              const assigned = users.filter(user => user.roleId === role.id).length
              return (
                <tr key={role.id}>
                  <td className="name-cell"><strong>{role.name} {role.isSystem ? '(system)' : ''}</strong><small>{role.description}</small></td>
                  <td>{assigned} user{assigned === 1 ? '' : 's'}</td>
                  <td className="role-scope">{scopeLabels[role.dataScope]}</td>
                  <td>{role.updatedAt ? format(new Date(role.updatedAt), 'dd MMM yyyy') : '-'}</td>
                  <td>
                    {role.isSystem ? (
                      <span className="locked-text"><Lock size={14} /> View permissions</span>
                    ) : (
                      <details className="row-menu">
                        <summary><MoreHorizontal size={18} /></summary>
                        <div>
                          <Link to={`/settings/roles/${role.id}`}>Edit</Link>
                          <button type="button" onClick={() => duplicateRole(role.id)}>Duplicate</button>
                          <button className="danger" type="button" onClick={() => removeRole(role.id)}>Delete</button>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {roles.filter(role => !role.isSystem).length === 0 && (
          <section className="settings-placeholder">Create a custom role if you need a permission combination that isn't covered by the default roles.</section>
        )}
      </div>
    </div>
  )
}
