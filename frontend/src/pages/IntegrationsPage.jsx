import React, { useMemo, useState } from 'react'
import './IntegrationsPage.css'

const integrations = [
  {
    id: 'aai',
    name: 'Airports Authority of India',
    code: 'AAI',
    logo: '/icons/integrations/airport.png',
    description: 'Retrieve airport and checkpoint information checks for travel screening operations for CSII and Geopol Analytics.',
    connected: false
  },
  {
    id: 'uidai',
    name: 'UIDAI Aadhaar',
    code: 'UID',
    logo: '/icons/integrations/uidai.avif',
    description: 'Retrieve aadhar detials and biometric details of iris and thumbprint for identity verification and authentication recommended for high-risk scenarios.',
    connected: false
  },
  {
    id: 'digilocker',
    name: 'DigiLocker',
    code: 'DL',
    logo: '/icons/integrations/digilocker.png',
    description: 'Will retrieve consented, issuer-verified identity and travel documents from DigiLocker used to cross verify idenitity safely with least persmissions.',
    connected: false
  },
  {
    id: 'natgrid',
    name: 'NATGRID',
    code: 'NG',
    logo: '/icons/integrations/natgrid.png',
    description: 'Retrieve national-level identity and biometric data for comprehensive verification across various databases recommended to be enabled across sensitive hotspots only.',
    connected: false
  },
  {
    id: 'passport',
    name: 'Passport Authority Records',
    code: 'PA',
    logo: '/icons/integrations/passport.png',
    description: 'Retrieve and validate passport identity, document status, and expiry information against official records.',
    connected: false
  }
]

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [query, setQuery] = useState('')
  const [connectionState, setConnectionState] = useState(() => Object.fromEntries(integrations.map(item => [item.id, item.connected])))
  const [detailsFor, setDetailsFor] = useState(null)

  const displayedIntegrations = useMemo(() => integrations.filter(item => {
    const connected = connectionState[item.id]
    const tabMatches = activeTab === 'all' || (activeTab === 'connected' ? connected : !connected)
    const queryMatches = `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
    return tabMatches && queryMatches
  }), [activeTab, connectionState, query])

  const toggleConnection = id => setConnectionState(state => ({ ...state, [id]: !state[id] }))
  const selected = integrations.find(item => item.id === detailsFor)

  return (
    <div className="integrations-page">
      <header className="integrations-header">
        <h1>Integrations</h1>
      </header>

      <div className="integrations-toolbar">
        <div className="integration-tabs" role="tablist" aria-label="Integration status">
          {[['all', 'All Applications'], ['connected', 'Connected'], ['disconnected', 'Disconnected']].map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={activeTab === value} className={activeTab === value ? 'active' : ''} onClick={() => setActiveTab(value)}>{label}</button>
          ))}
        </div>
        <label className="integration-search">
          <span className="sr-only">Search integrations</span>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search integrations" />
        </label>
      </div>

      <section className="integration-group" aria-labelledby="government-integrations-heading">
        <h2 id="government-integrations-heading">Government Verification Systems</h2>
        <p>Connect trusted government sources to support document, identity, biometric, and travel-record verification.</p>
        <div className="integration-grid">
          {displayedIntegrations.map(item => {
            const connected = connectionState[item.id]
            return (
              <article className="integration-card" key={item.id}>
                <div className="integration-card-main">
                  <div className="integration-logo-slot">
                    <img src={item.logo} alt={`${item.name} logo`} loading="lazy" />
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
                <footer>
                  <button type="button" className="integration-details" onClick={() => setDetailsFor(item.id)}>Details</button>
                  <button type="button" className={connected ? 'integration-remove' : 'integration-connect'} onClick={() => toggleConnection(item.id)}>{connected ? 'Remove' : 'Connect'}</button>
                  <button type="button" className={`integration-switch ${connected ? 'on' : ''}`} onClick={() => toggleConnection(item.id)} aria-label={`${connected ? 'Disconnect' : 'Connect'} ${item.name}`} aria-pressed={connected}><span /></button>
                </footer>
              </article>
            )
          })}
        </div>
        {!displayedIntegrations.length && <div className="integration-empty">No integrations match the selected filter.</div>}
      </section>

      {selected && (
        <div className="integration-modal-backdrop" role="presentation" onMouseDown={() => setDetailsFor(null)}>
          <section className="integration-modal" role="dialog" aria-modal="true" aria-labelledby="integration-details-title" onMouseDown={event => event.stopPropagation()}>
            <header><h2 id="integration-details-title">{selected.name}</h2><button type="button" onClick={() => setDetailsFor(null)} aria-label="Close">×</button></header>
            <p>{selected.description}</p>
            <small>Connection setup is a frontend preview. Secure API credentials and authorization flows will be added with the backend integration.</small>
            <footer><button type="button" onClick={() => setDetailsFor(null)}>Close</button></footer>
          </section>
        </div>
      )}
    </div>
  )
}
