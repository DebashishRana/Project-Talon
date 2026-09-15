import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'
import './NavbarTheme.css'

function Navbar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          <img src="/Logo.png" alt="VERIquick Logo" className="logo-image" />
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
          <Link to="/upload" className={`navbar-link upload-nav-link ${isActive('/upload') ? 'active' : ''}`}><span className="nav-plus">+</span> Upload document</Link>
          <Link to="/scan" className={`navbar-link ${isActive('/scan') ? 'active' : ''}`}>Verification scanner</Link>
          <Link to="/about" className={`navbar-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
        </div>
        <div className="navbar-actions"><span className="status-dot" /> <span>System operational</span><span className="avatar">DS</span></div>
      </div>
    </nav>
  )
}

export default Navbar
