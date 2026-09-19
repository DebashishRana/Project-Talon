import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultRoles } from '../data/defaultRoles'
import type { AuditEvent, ModuleKey, Permission, Role, User } from '../types/rbac'

type RoleInput = Omit<Role, 'id' | 'createdAt'>
type UserInput = Omit<User, 'id' | 'createdAt'>

interface RBACStore {
  roles: Role[]
  users: User[]
  auditEvents: AuditEvent[]
  currentUserId: string
  addRole: (role: RoleInput) => Role
  updateRole: (id: string, patch: Partial<Role>) => void
  deleteRole: (id: string) => void
  getRoleById: (id: string) => Role | undefined
  addUser: (user: UserInput) => User
  updateUser: (id: string, patch: Partial<User>) => void
  deleteUser: (id: string) => void
  getUserById: (id: string) => User | undefined
  addAuditEvent: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => AuditEvent
  hasPermission: (userId: string, module: ModuleKey, action: Permission) => boolean
  canAccessRoute: (userId: string, route: string) => boolean
  seedDefaultRoles: () => void
}

const currentUser: User = {
  id: 'super_admin',
  fullName: 'Super Admin',
  email: 'admin@ssb.gov.in',
  roleId: 'super_admin',
  status: 'ACTIVE',
  createdAt: '2026-09-17T00:00:00.000Z',
  lastLoginAt: new Date().toISOString()
}

function makeId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}_${random}`
}

function getRouteRequirement(route: string): { module: ModuleKey; action: Permission } | null {
  if (route === '/settings/users/new') return { module: 'user_access', action: 'create' }
  if (route.startsWith('/settings/users')) return { module: 'user_access', action: 'read' }
  if (route === '/settings/roles/new') return { module: 'role_definitions', action: 'create' }
  if (route.startsWith('/settings/roles')) return { module: 'role_definitions', action: 'read' }
  if (route.startsWith('/settings')) return { module: 'settings', action: 'read' }
  return null
}

export const useRBACStore = create<RBACStore>()(
  persist(
    (set, get) => ({
      roles: [],
      users: [],
      auditEvents: [],
      currentUserId: 'super_admin',
      addRole: roleInput => {
        const role: Role = {
          ...roleInput,
          id: makeId('role'),
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        set(state => ({ roles: [...state.roles, role] }))
        return role
      },
      updateRole: (id, patch) => {
        set(state => ({
          roles: state.roles.map(role => (
            role.id === id && !role.isSystem
              ? { ...role, ...patch, id: role.id, isSystem: role.isSystem, updatedAt: new Date().toISOString() }
              : role
          ))
        }))
      },
      deleteRole: id => {
        set(state => ({
          roles: state.roles.filter(role => role.id !== id || role.isSystem),
          users: state.users.map(user => user.roleId === id ? { ...user, roleId: 'operative' } : user)
        }))
      },
      getRoleById: id => get().roles.find(role => role.id === id),
      addUser: userInput => {
        const user: User = {
          ...userInput,
          id: makeId('user'),
          createdAt: new Date().toISOString()
        }
        set(state => ({ users: [...state.users, user] }))
        return user
      },
      updateUser: (id, patch) => {
        set(state => ({
          users: state.users.map(user => (
            user.id === id ? { ...user, ...patch, id: user.id, createdAt: user.createdAt } : user
          ))
        }))
      },
      deleteUser: id => {
        set(state => ({ users: state.users.filter(user => user.id !== id || user.id === state.currentUserId) }))
      },
      getUserById: id => get().users.find(user => user.id === id),
      addAuditEvent: eventInput => {
        const event: AuditEvent = {
          ...eventInput,
          id: makeId('audit'),
          createdAt: new Date().toISOString()
        }
        set(state => ({ auditEvents: [event, ...state.auditEvents].slice(0, 500) }))
        return event
      },
      hasPermission: (userId, module, action) => {
        const user = get().users.find(item => item.id === userId)
        const role = get().roles.find(item => item.id === user?.roleId)
        if (!user || !role || user.status === 'SUSPENDED') return false
        if (role.id === 'super_admin') return true
        return Boolean(role.permissions.find(item => item.module === module)?.[action])
      },
      canAccessRoute: (userId, route) => {
        const requirement = getRouteRequirement(route)
        if (!requirement) return true
        return get().hasPermission(userId, requirement.module, requirement.action)
      },
      seedDefaultRoles: () => {
        set(state => {
          const roles = state.roles.length ? state.roles : defaultRoles
          const users = state.users.some(user => user.id === 'super_admin')
            ? state.users
            : [currentUser, ...state.users]
          return { roles, users, currentUserId: 'super_admin' }
        })
      }
    }),
    {
      name: 'talon_rbac_v1',
      version: 1,
      onRehydrateStorage: () => state => state?.seedDefaultRoles()
    }
  )
)

useRBACStore.getState().seedDefaultRoles()
