import React from 'react'

function SessionDetailDrawer({ session, onClose }) {
  if (!session) return null

  return (
    <aside className="vl-drawer" aria-label="Session details">
      <div className="vl-drawer-backdrop" onClick={onClose} />
      <section className="vl-drawer-panel">
        <header>
          <div>
            <p>SESSION DETAILS</p>
            <h2>{session.id}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details">×</button>
        </header>
        <div className="vl-drawer-grid">
          <div><span>Subject</span><strong>{session.subjectNameMasked}</strong><small>{session.subjectNationality} · DOB {session.subjectDobMasked}</small></div>
          <div><span>Document</span><strong>{session.documentType.replaceAll('_', ' ')}</strong><small>{session.documentCountry} · {session.documentNumberMasked}</small></div>
          <div><span>Decision</span><strong>{session.status.replaceAll('_', ' ')}</strong><small>{session.riskLevel} risk · {Number(session.riskScore).toFixed(3)}</small></div>
          <div><span>Officer</span><strong>{session.officerName}</strong><small>{session.checkpointName}</small></div>
        </div>
        {session.sentinelCase?.enabled && (
          <div className="vl-notes">
            <strong>SentinelTrail database</strong>
            <p>
              {session.sentinelCase.recorded
                ? `Recorded as ${session.sentinelCase.case_reference} with biometric check ${session.sentinelCase.biometric_check_id}.`
                : `Not recorded: ${session.sentinelCase.error || 'database write was skipped'}.`}
            </p>
          </div>
        )}
        {session.faceMatch !== undefined && (
          <>
            <h3>Face verification</h3>
            <div className="vl-face-card">
              <div className="vl-face-preview-row">
                {session.documentFaceBase64 && <img src={session.documentFaceBase64} alt="Extracted document face" />}
                {session.liveFaceBase64 && <img src={session.liveFaceBase64} alt="Live face capture" />}
                <div>
                  <span>Document to live match</span>
                  <strong>{Number(session.faceMatch || 0).toFixed(1)}%</strong>
                  <small>{session.faceVerification?.provider === 'aws-rekognition' ? 'AWS Rekognition' : 'Local fallback'}</small>
                </div>
              </div>
              <div className="vl-face-observations">
                {(session.faceObservations || []).map(item => (
                  <p key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></p>
                ))}
              </div>
            </div>
          </>
        )}
        <h3>Evidence signals</h3>
        <div className="vl-signal-list">
          {(session.pipeline || []).map(result => (
            <div className={`vl-signal ${String(result.status).toLowerCase()}`} key={result.stage}>
              <strong>{result.stage}</strong>
              <span>{result.status}</span>
              <small>{result.confidence ? `${result.confidence}% confidence` : 'No confidence score'}{result.detail ? ` · ${result.detail}` : ''}</small>
            </div>
          ))}
        </div>
        <h3>CSII monitoring</h3>
        <div className="vl-notes">
          <strong>{session.csiiStatus}</strong>
          <p>{session.csiiAnomalies.length ? session.csiiAnomalies.join(', ') : 'No CSII anomalies recorded.'}</p>
        </div>
        {session.notes && <div className="vl-notes"><strong>Officer notes</strong><p>{session.notes}</p></div>}
      </section>
    </aside>
  )
}

export default SessionDetailDrawer
