import { useRBACStore } from '../store/rbacStore'
import type { AuditEvent } from '../types/rbac'

type AuditInput = Omit<AuditEvent, 'id' | 'actorId' | 'createdAt'>

export function writeAuditEvent(event: AuditInput) {
  const store = useRBACStore.getState()
  store.addAuditEvent({
    ...event,
    actorId: store.currentUserId
  })
}
