import React, { useState } from 'react'
import { ArrowRight, ChevronRight, Search, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { csiiMockResult } from '../data/csiiMockResult'
import './CSIIPage.css'

export default function CSIIPage() {
  const [verificationId, setVerificationId] = useState('')
  const [searchedId, setSearchedId] = useState('')
  const search = event => {
    event.preventDefault()
    if (verificationId.trim()) setSearchedId(verificationId.trim())
  }
  return <div className="csii-page">
    <nav className="csii-page-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Overview</Link><ChevronRight size={12} /><span>CSII</span></nav>
    <main className="csii-search-page">
      <span className="csii-search-kicker"><ShieldAlert size={15} /> Cross-session identity intelligence</span>
      <h1>Search verification records</h1>
      <p>Enter a verification ID to view the synthetic CSII demonstration.</p>
      <form className="csii-search-form" onSubmit={search}>
        <Search size={18} />
        <input value={verificationId} onChange={event => setVerificationId(event.target.value)} placeholder="Enter verification ID" aria-label="Enter verification ID" autoFocus />
        <button type="submit" aria-label="Search verification ID" title="Search"><ArrowRight size={18} /></button>
      </form>
      {searchedId && <section className="csii-search-result">
        <span className="csii-result-label">Synthetic demo result</span>
        <strong>{searchedId}</strong>
        <div><span>Status</span><b>{csiiMockResult.status}</b></div>
        <p>{csiiMockResult.summary}</p>
      </section>}
    </main>
  </div>
}
