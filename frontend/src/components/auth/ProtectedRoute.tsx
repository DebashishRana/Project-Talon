import React from 'react'
import { ShieldOff } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import { useRBACStore } from '../../store/rbacStore'
import type { ModuleKey, Permission } from '../../types/rbac'
import '../../pages/settings/SettingsPages.css'

interface ProtectedRouteProps {
  module: ModuleKey
  action: Permission
  children: React.ReactNode
}

export default function ProtectedRoute({ module, action, children }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const allowed = usePermission(module, action)
  const isAuthenticated = useRBACStore(state => state.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (!allowed) {
    return (
      <div className="settings-page">
        <section className="access-denied">
          <ShieldOff size={42} />
          <h1>Access denied</h1>
          <p>Your role does not have permission to view this page.</p>
          <button type="button" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
        </section>
      </div>
    )
  }

  return <>{children}</>
}
