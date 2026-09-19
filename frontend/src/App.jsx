import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import UploadRouter from './pages/upload/UploadRouter'
import DashboardPage from './pages/DashboardPage'
import ScannerPage from './pages/ScannerPage'
import AdminPage from './pages/AdminPage'
import AboutPage from './pages/AboutPage'
import LoginPage from './pages/LoginPage'
import VerificationLogs from './pages/VerificationLogs'
import ProtectedRoute from './components/auth/ProtectedRoute'
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage'
import UserListPage from './pages/settings/UserListPage'
import AddUserPage from './pages/settings/AddUserPage'
import EditUserPage from './pages/settings/EditUserPage'
import RoleListPage from './pages/settings/RoleListPage'
import CreateRolePage from './pages/settings/CreateRolePage'
import EditRolePage from './pages/settings/EditRolePage'
import './App.css'

function AppContent() {
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const isAuthPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/login' || location.pathname === '/signup'
  const isUploadFlow = location.pathname.startsWith('/upload')

  return (
    <div className={`app ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {!isUploadFlow && <button
        className="theme-toggle"
        type="button"
        onClick={() => setIsDarkMode(value => !value)}
        aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDarkMode ? 'Light' : 'Dark'}
      </button>}
      <main className={`main-content ${isAuthPage ? 'auth-layout' : ''}`}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload/*" element={<UploadRouter />} />
          <Route path="/verifications" element={<VerificationLogs />} />
          <Route path="/scan" element={<ScannerPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/settings" element={<ProtectedRoute module="settings" action="read"><GeneralSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/users" element={<ProtectedRoute module="user_access" action="read"><UserListPage /></ProtectedRoute>} />
          <Route path="/settings/users/new" element={<ProtectedRoute module="user_access" action="create"><AddUserPage /></ProtectedRoute>} />
          <Route path="/settings/users/:id" element={<ProtectedRoute module="user_access" action="update"><EditUserPage /></ProtectedRoute>} />
          <Route path="/settings/roles" element={<ProtectedRoute module="role_definitions" action="read"><RoleListPage /></ProtectedRoute>} />
          <Route path="/settings/roles/new" element={<ProtectedRoute module="role_definitions" action="create"><CreateRolePage /></ProtectedRoute>} />
          <Route path="/settings/roles/:id" element={<ProtectedRoute module="role_definitions" action="update"><EditRolePage /></ProtectedRoute>} />
        </Routes>
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

