import { sessionStore } from '../store/sessionStore'
import { useRBACStore } from '../store/rbacStore'
import {
  FLAG_REASONS,
  REJECT_REASONS,
  buildDecisionRecord,
  buildSavedSession,
  buildVerificationModel,
  documentTypeLabel,
  extractSubjectFields,
  normalizeDocumentType
} from './sessionVerificationModel.js'

export {
  FLAG_REASONS,
  REJECT_REASONS,
  buildDecisionRecord,
  buildSavedSession,
  buildVerificationModel,
  documentTypeLabel,
  extractSubjectFields,
  normalizeDocumentType
}

export function saveUploadSession(uploadSession = {}) {
  if (uploadSession.savedSessionId) return sessionStore.getSessionById(uploadSession.savedSessionId)
  return sessionStore.addSession(buildSavedSession(uploadSession))
}

export function updateCsiiForSession(sessionId, csiiResult) {
  const current = sessionStore.getSessionById(sessionId)
  if (!current) return
  const updated = {
    ...current,
    csiiResult,
    csiiStatus: csiiResult?.status === 'CLEAR' ? 'ON' : 'MONITORING',
    csiiAnomalyCount: csiiResult?.anomalies?.length || 0,
    csiiAnomalies: (csiiResult?.anomalies || []).map(item => item.type || item)
  }
  sessionStore.updateSession(sessionId, {
    csiiResult,
    csiiStatus: updated.csiiStatus,
    csiiAnomalyCount: updated.csiiAnomalyCount,
    csiiAnomalies: updated.csiiAnomalies,
    pipeline: buildVerificationModel(updated).pipeline
  })
}

export function recordSessionDecision(sessionId, decision, { reason = '', notes = '', actor } = {}) {
  const session = sessionStore.getSessionById(sessionId)
  const { patch, auditEvent } = buildDecisionRecord(session, decision, { reason, notes, actor })
  sessionStore.updateSession(sessionId, patch)
  useRBACStore.getState().addAuditEvent(auditEvent)
}
