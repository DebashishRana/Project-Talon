export type ModuleKey =
  | 'dashboard'
  | 'sessions'
  | 'flagged_cases'
  | 'csii_graph'
  | 'verification_logs'
  | 'audit_trail'
  | 'reports'
  | 'analytics'
  | 'user_access'
  | 'role_definitions'
  | 'devices'
  | 'model_registry'
  | 'settings'
  | 'integrations'

export type Permission = 'create' | 'read' | 'update' | 'delete'
export type DataScope = 'own' | 'checkpoint' | 'organization' | 'all'

export interface ModulePermissions {
  module: ModuleKey
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
  dataScope: DataScope
  permissions: ModulePermissions[]
  createdAt: string
  updatedAt?: string
}

export interface User {
  id: string
  fullName: string
  email: string
  roleId: string
  checkpointId?: string
  phone?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  createdAt: string
  lastLoginAt?: string
  passwordHash?: string
  forcePasswordChange?: boolean
  requireMfa?: boolean
  sessionTimeoutMinutes?: number
}

export interface AuditEvent {
  id: string
  type:
    | 'user.created'
    | 'user.updated'
    | 'user.deleted'
    | 'user.suspended'
    | 'user.role_changed'
    | 'role.created'
    | 'role.updated'
    | 'role.deleted'
    | 'password.reset'
    | 'checkpoint.created'
    | 'session.verified'
    | 'session.flagged'
    | 'session.rejected'
  actorId: string
  targetId?: string
  message: string
  createdAt: string
  metadata?: Record<string, unknown>
}
