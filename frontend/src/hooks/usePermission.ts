import { useRBACStore } from '../store/rbacStore'
import type { ModuleKey, Permission } from '../types/rbac'

export function usePermission(module: ModuleKey, action: Permission) {
  const hasPermission = useRBACStore(state => state.hasPermission)
  const currentUserId = useRBACStore(state => state.currentUserId)
  return hasPermission(currentUserId, module, action)
}
