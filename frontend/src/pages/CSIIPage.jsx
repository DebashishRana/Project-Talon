import React, { useState } from 'react'
import { ChevronRight, Network, ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { csiiMockResult } from '../data/csiiMockResult'
import { useSessionStore } from '../store/sessionStore'
import CSIIGraphDialog from './upload/CSIIGraphDialog'
import './CSIIPage.css'

export default function CSIIPage() {
  const [searchParams] = useSearchParams()
  const identityId = searchParams.get('identity')
  const linkedSession = useSessionStore(state => state.sessions.find(item => item.id === identityId))
  const [open, setOpen] = useState(true)
  const graphResult = linkedSession?.csiiResult || csiiMockResult
  return <div className="csii-page">
    <nav className="csii-page-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Overview</Link><ChevronRight size={12} /><span>CSII</span></nav>
    <header className="csii-page-header">
      <div><span><Network size={15} /> Cross-session identity intelligence</span><h1>CSII mockup workspace</h1><p>Demo graph for face reference, document reuse, synthetic Aadhaar-style identity, and travel correlation signals.</p></div>
      <button type="button" onClick={() => setOpen(true)}><Network size={16} /> Open graph</button>
    </header>
    {identityId && <section className="csii-session-context">
      <strong>{linkedSession ? `Review context: ${linkedSession.id}` : `Review context: ${identityId}`}</strong>
      <p>{linkedSession ? `${linkedSession.subjectNameMasked} · ${linkedSession.documentNumberMasked}` : 'This opened from a verification session, but the local session record was not found.'} CSII data shown here remains synthetic unless the session has a recorded CSII result.</p>
      {linkedSession && <Link to={`/verifications/${encodeURIComponent(linkedSession.id)}`}>Back to verification</Link>}
    </section>}
    <section className="csii-page-summary">
      <article><ShieldAlert size={18} /><span>Advisory status</span><strong>{graphResult.status || 'Review'}</strong><p>{graphResult.anomalies?.length || 0} synthetic anomaly signals</p></article>
      <article><Network size={18} /><span>Graph nodes</span><strong>{graphResult.graph?.nodes?.length || 0}</strong><p>Face, identity, document, and travel evidence</p></article>
      <article><Network size={18} /><span>Mode</span><strong>Demo</strong><p>No live Aadhaar, immigration, or biometric identity feed</p></article>
    </section>
    <section className="csii-page-note">
      <h2>Demo boundary</h2>
      <p>This page intentionally uses synthetic records. It is meant to show how TALON would present a correlation layer after OCR, MRZ, document classification, and face comparison finish.</p>
    </section>
    {open && <CSIIGraphDialog result={graphResult} loading={false} error="" onClose={() => setOpen(false)} onScenarioChange={() => {}} />}
  </div>
}
