import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UploadRouter from './pages/upload/UploadRouter'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import AnalyticsPage from './pages/AnalyticsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import GeoIntelPage from './pages/GeoIntelPage'
import CSIIPage from './pages/CSIIPage'
import LoginPage from './pages/LoginPage'
import VerificationLogs from './pages/VerificationLogs'
import VerificationDetail from './pages/VerificationDetail'
import FinalVerificationPage from './pages/FinalVerificationPage'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/auth/ProtectedRoute'
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage'
import UserListPage from './pages/settings/UserListPage'
import AddUserPage from './pages/settings/AddUserPage'
import EditUserPage from './pages/settings/EditUserPage'
import RoleListPage from './pages/settings/RoleListPage'
import CreateRolePage from './pages/settings/CreateRolePage'
import EditRolePage from './pages/settings/EditRolePage'
import { useRBACStore } from './store/rbacStore'
import './App.css'
import './styles/zoomBase.css'

function AppContent() {
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const isAuthenticated = useRBACStore(state => state.isAuthenticated)
  const isAuthPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/login' || location.pathname === '/signup'
  const appRoutes = (
    <Routes>
      <Route path="/dashboard" element={<ProtectedRoute module="dashboard" action="read"><DashboardPage /></ProtectedRoute>} />
      <Route path="/upload/*" element={<ProtectedRoute module="sessions" action="create"><UploadRouter /></ProtectedRoute>} />
      <Route path="/verifications" element={<ProtectedRoute module="verification_logs" action="read"><VerificationLogs /></ProtectedRoute>} />
      <Route path="/verifications/:sessionId" element={<ProtectedRoute module="verification_logs" action="read"><FinalVerificationPage /></ProtectedRoute>} />
      <Route path="/verifications/:sessionId/details" element={<ProtectedRoute module="verification_logs" action="read"><VerificationDetail /></ProtectedRoute>} />
      <Route path="/scan" element={<Navigate to="/geopol" replace />} />
      <Route path="/geopol" element={<ProtectedRoute module="devices" action="read"><GeoIntelPage /></ProtectedRoute>} />
      <Route path="/csii" element={<ProtectedRoute module="csii_graph" action="read"><CSIIPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute module="settings" action="read"><AdminPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute module="analytics" action="read"><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute module="integrations" action="read"><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute module="settings" action="read"><GeneralSettingsPage /></ProtectedRoute>} />
      <Route path="/settings/users" element={<ProtectedRoute module="user_access" action="read"><UserListPage /></ProtectedRoute>} />
      <Route path="/settings/users/new" element={<ProtectedRoute module="user_access" action="create"><AddUserPage /></ProtectedRoute>} />
      <Route path="/settings/users/:id" element={<ProtectedRoute module="user_access" action="update"><EditUserPage /></ProtectedRoute>} />
      <Route path="/settings/roles" element={<ProtectedRoute module="role_definitions" action="read"><RoleListPage /></ProtectedRoute>} />
      <Route path="/settings/roles/new" element={<ProtectedRoute module="role_definitions" action="create"><CreateRolePage /></ProtectedRoute>} />
      <Route path="/settings/roles/:id" element={<ProtectedRoute module="role_definitions" action="update"><EditRolePage /></ProtectedRoute>} />
    </Routes>
  )

  return (
    <div className={`app ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {isAuthPage && <button
        className="theme-toggle"
        type="button"
        onClick={() => setIsDarkMode(value => !value)}
        aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDarkMode ? 'Light' : 'Dark'}
      </button>}
      <main className={`main-content ${isAuthPage ? 'auth-layout' : ''}`}>
        {isAuthPage ? (
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/auth" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : isAuthenticated ? (
          <AppShell isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(value => !value)}>
            {appRoutes}
          </AppShell>
        ) : (
          <Navigate to="/login" replace />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App

