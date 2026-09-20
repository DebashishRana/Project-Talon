import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  Info,
  Lock,
  Radar,
  ScanLine,
  Settings,
  ShieldCheck,
  UserCog,
  Users
} from 'lucide-react'
import { usePermission } from '../hooks/usePermission'
import './AppShell.css'

const COLLAPSE_KEY = 'talon_nav_collapsed_v1'

function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} to={to} end={end}>
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
  const canReadSettings = usePermission('settings', 'read')
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
            <NavItem to="/dashboard" icon={Gauge} label="Dashboard" />
          </NavSection>

          <NavSection title="Verification">
            <NavItem to="/upload/authorize" icon={ScanLine} label="New Verification" />
            <NavItem to="/verifications" icon={FileText} label="Verification Logs" end />
            <NavItem to="/scan" icon={Radar} label="Scanner" />
          </NavSection>

          <NavSection title="Workspace">
            <NavItem to="/admin" icon={UserCog} label="Admin Console" />
            <NavItem to="/about" icon={Info} label="About" />
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
          <button type="button" onClick={onToggleTheme} aria-label="Toggle color theme">
            <Activity size={14} />
            <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
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
