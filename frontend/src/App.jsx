import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import UploadRouter from './pages/upload/UploadRouter'
import DashboardPage from './pages/DashboardPage'
import ScannerPage from './pages/ScannerPage'
import AdminPage from './pages/AdminPage'
import AboutPage from './pages/AboutPage'
import LoginPage from './pages/LoginPage'
import VerificationLogs from './pages/VerificationLogs'
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

