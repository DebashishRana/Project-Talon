import type { ModuleKey, ModulePermissions, Role } from '../types/rbac'

export const MODULES: Array<{ key: ModuleKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sessions', label: 'Screening Sessions' },
  { key: 'flagged_cases', label: 'Flagged Cases' },
  { key: 'csii_graph', label: 'CSII Graph' },
  { key: 'verification_logs', label: 'Verification Logs' },
  { key: 'audit_trail', label: 'Audit Trail' },
  { key: 'reports', label: 'Reports' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'user_access', label: 'User & Access' },
  { key: 'role_definitions', label: 'Role Definitions' },
  { key: 'devices', label: 'Devices' },
  { key: 'model_registry', label: 'Model Registry' },
  { key: 'settings', label: 'Settings' },
  { key: 'integrations', label: 'Integrations' }
]

const now = '2026-09-17T00:00:00.000Z'

function makePermissions(values: Partial<Record<ModuleKey, Partial<Omit<ModulePermissions, 'module'>>>>): ModulePermissions[] {
  return MODULES.map(({ key }) => ({
    module: key,
    create: Boolean(values[key]?.create),
    read: Boolean(values[key]?.read),
    update: Boolean(values[key]?.update),
    delete: Boolean(values[key]?.delete)
  }))
}

const all = MODULES.reduce((record, { key }) => {
  record[key] = { create: true, read: true, update: true, delete: true }
  return record
}, {} as Record<ModuleKey, Omit<ModulePermissions, 'module'>>)

export const defaultRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full platform access. Manages users, roles, and system settings.',
    isSystem: true,
    dataScope: 'all',
    permissions: makePermissions(all),
    createdAt: now
  },
  {
    id: 'operative',
    name: 'Operative',
    description: 'Field officer. Can perform screening sessions and manage own records. Cannot access admin settings.',
    isSystem: true,
    dataScope: 'own',
    permissions: makePermissions({
      dashboard: { read: true },
      sessions: { create: true, read: true, update: true },
      flagged_cases: { read: true },
      csii_graph: { read: true },
      verification_logs: { read: true },
      reports: { read: true },
      devices: { read: true }
    }),
    createdAt: now
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Read-only access to logs, analytics, and audit trails. Cannot modify any operational data.',
    isSystem: true,
    dataScope: 'all',
    permissions: makePermissions({
      dashboard: { read: true },
      sessions: { read: true },
      flagged_cases: { read: true },
      csii_graph: { read: true },
      verification_logs: { read: true },
      audit_trail: { read: true },
      reports: { read: true },
      analytics: { read: true },
      role_definitions: { read: true },
      devices: { read: true },
      model_registry: { read: true },
      settings: { read: true },
      integrations: { read: true }
    }),
    createdAt: now
  }
]

export function blankPermissions(): ModulePermissions[] {
  return makePermissions({})
}
