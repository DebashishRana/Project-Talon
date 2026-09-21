import { create } from 'zustand'
import { canManageCheckpoints, DEFAULT_CHECKPOINTS, validateCheckpoint } from '../data/checkpoints'
import { useRBACStore } from './rbacStore'

const STORAGE_KEY = 'talon_checkpoints_v1'

function readCheckpoints() {
  const checkpoints = [...DEFAULT_CHECKPOINTS]
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(saved)) return checkpoints
    for (const entry of saved) {
      try {
        if (typeof entry.id !== 'string' || !entry.id.startsWith('custom-') || checkpoints.some(item => item.id === entry.id)) continue
        checkpoints.push({ ...validateCheckpoint(entry, checkpoints), id: entry.id, custom: true })
      } catch { /* Ignore a malformed entry without discarding the remaining catalog. */ }
    }
  } catch { /* The built-in catalog also works before browser storage is available. */ }
  return checkpoints
}

export const useCheckpointStore = create((set, get) => ({
  checkpoints: readCheckpoints(),
  addCheckpoint(input) {
    const rbac = useRBACStore.getState()
    const user = rbac.users.find(item => item.id === rbac.currentUserId)
    const role = rbac.roles.find(item => item.id === user?.roleId)
    if (!rbac.isAuthenticated || !canManageCheckpoints(user, role)) throw new Error('You do not have permission to add checkpoints.')
    const latest = readCheckpoints()
    const checkpoint = { ...validateCheckpoint(input, latest), id: `custom-${crypto.randomUUID()}`, custom: true }
    const checkpoints = [...latest, checkpoint]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoints.filter(item => item.custom)))
    } catch {
      throw new Error('Checkpoint could not be saved. Check available browser storage and try again.')
    }
    set({ checkpoints })
    rbac.addAuditEvent({ type: 'checkpoint.created', actorId: user.id, targetId: checkpoint.id, message: `Added checkpoint ${checkpoint.name}`, metadata: { stateCode: checkpoint.stateCode } })
    return checkpoint
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) useCheckpointStore.setState({ checkpoints: readCheckpoints() })
  })
}
