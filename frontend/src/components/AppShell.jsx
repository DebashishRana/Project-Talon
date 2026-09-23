import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  Bot,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  Lock,
  LogOut,
  MapPinned,
  Network,
  Plug,
  ScanLine,
  Settings,
  ShieldCheck,
  UserCog,
  Users
} from 'lucide-react'
import { usePermission } from '../hooks/usePermission'
import { useRBACStore } from '../store/rbacStore'
import './AppShell.css'

const COLLAPSE_KEY = 'talon_nav_collapsed_v1'

function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} to={to} end={end} aria-label={label} title={label}>
      <Icon size={15} />
      <span>{label}</span>
    </NavLink>
  )
}

function NavSection({ title, children }) {
  return (
    <section className="app-nav-section">
      <p>{title}</p>
      {children}
    </section>
  )
}

export default function AppShell({ children, isDarkMode, onToggleTheme }) {
  const location = useLocation()
  const navigate = useNavigate()
  const canReadDashboard = usePermission('dashboard', 'read')
  const canCreateSessions = usePermission('sessions', 'create')
  const canReadLogs = usePermission('verification_logs', 'read')
  const canReadDevices = usePermission('devices', 'read')
  const canReadCsii = usePermission('csii_graph', 'read')
  const canReadSettings = usePermission('settings', 'read')
  const canReadAnalytics = usePermission('analytics', 'read')
  const canReadIntegrations = usePermission('integrations', 'read')
  const logout = useRBACStore(state => state.logout)
  const currentUser = useRBACStore(state => state.users.find(user => user.id === state.currentUserId))
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    }
  }, [collapsed])

  useEffect(() => {
    document.body.dataset.navCollapsed = String(collapsed)
  }, [collapsed])

  const inSettings = location.pathname.startsWith('/settings')
  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="app-brand">
          <div className="app-brand-mark"><ShieldCheck size={17} /></div>
          <div>
            <strong>TALON</strong>
            <small>Border ops</small>
          </div>
        </div>

        <button
          className="app-sidebar-toggle"
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        <nav className="app-nav">
          <NavSection title="Overview">
            {canReadDashboard && <NavItem to="/dashboard" icon={Gauge} label="Dashboard" />}
            <NavItem to="/ask-talon" icon={Bot} label="Ask Talon" />
          </NavSection>

          <NavSection title="Verification">
            {canCreateSessions && <NavItem to="/upload/authorize" icon={ScanLine} label="New Verification" />}
            {canReadLogs && <NavItem to="/verifications" icon={FileText} label="Verification Logs" end />}
            {canReadDevices && <NavItem to="/geopol" icon={MapPinned} label="Geopol" />}
            {canReadCsii && <NavItem to="/csii" icon={Network} label="CSII" />}
          </NavSection>

          <NavSection title="Workspace">
            {canReadSettings && <NavItem to="/admin" icon={UserCog} label="Admin Console" />}
            {canReadAnalytics && <NavItem to="/analytics" icon={BarChart3} label="Analytics" />}
            {canReadIntegrations && <NavItem to="/integrations" icon={Plug} label="Integrations" />}
          </NavSection>

          {canReadSettings && (
            <NavSection title="Settings">
              <NavItem to="/settings" icon={Settings} label="General" end />
              <NavItem to="/settings/users" icon={Users} label="User & Access" />
              <NavItem to="/settings/roles" icon={Lock} label="Role Definitions" />
            </NavSection>
          )}
        </nav>

        <div className="app-sidebar-footer">
          <small>{currentUser?.fullName || 'Authorized user'}</small>
          <button type="button" onClick={onToggleTheme} aria-label="Toggle color theme">
            <Activity size={14} />
            <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button type="button" onClick={signOut} aria-label="Sign out">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
          <small>{inSettings ? 'Settings active' : 'Operational workspace'}</small>
        </div>
      </aside>

      <section className="app-shell-main">
        {children}
      </section>
    </div>
  )
}
