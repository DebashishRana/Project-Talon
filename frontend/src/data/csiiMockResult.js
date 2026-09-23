export const csiiMockResult = {
  run_id: 'CSII-DEMO-20260921-001',
  mode: 'SYNTHETIC_DEMO',
  scenario: 'combined',
  status: 'REVIEW',
  signal_score: 0.87,
  summary: 'Synthetic CSII demo records only. No Aadhaar, immigration, or external identity system was queried.',
  source_layers: ['session_evidence', 'synthetic_aadhaar_layer', 'synthetic_travel_ledger'],
  anomalies: [
    { type: 'IDENTITY_HOPPING', severity: 'critical', explanation: 'Synthetic alias appears with the same session face reference across two document numbers.' },
    { type: 'DOCUMENT_REUSE', severity: 'critical', explanation: 'Synthetic document token appears in two unrelated verification trails.' },
    { type: 'IMPOSSIBLE_TRAVEL', severity: 'critical', explanation: 'Synthetic travel events imply movement faster than the configured review threshold.' }
  ],
  graph: {
    nodes: [
      { id: 'face-current', type: 'face', severity: 'normal', label: 'FACE-REF-8C21A9F0', subtitle: 'Current session evidence anchor', position: { x: 0, y: 145 }, details: { source: 'Live capture + document portrait', note: 'Opaque session reference, not a biometric hash' } },
      { id: 'identity-current', type: 'identity', severity: 'normal', label: 'RAHUL S****', subtitle: 'Extracted identity from OCR/MRZ', position: { x: 280, y: 60 }, details: { nationality: 'IND', dob: '1990-**-**', confidence: '95.2%' } },
      { id: 'aadhaar-demo', type: 'aadhaar', severity: 'critical', label: 'Demo Aadhaar layer', subtitle: 'Synthetic identity reference', position: { x: 570, y: 0 }, details: { reference: 'DEMO-XXXX-2084', status: 'Synthetic conflict' } },
      { id: 'document-current', type: 'document', severity: 'normal', label: 'VISA J12****7', subtitle: 'Current submitted document', position: { x: 570, y: 150 }, details: { classifier: 'Visa', mrz: 'Found', ocr: 'Extracted' } },
      { id: 'document-prior', type: 'document', severity: 'critical', label: 'Passport ZA270***', subtitle: 'Synthetic prior document', position: { x: 850, y: 80 }, details: { relationship: 'Document reuse demo', status: 'Review' } },
      { id: 'travel-1', type: 'travel', severity: 'normal', label: 'Raxaul ICP', subtitle: 'Entry · 08:20 IST', position: { x: 260, y: 280 }, details: { event: 'ENTRY', checkpoint: 'Raxaul ICP' } },
      { id: 'travel-2', type: 'travel', severity: 'critical', label: 'Delhi IGI', subtitle: 'Check-in · 14:45 IST', position: { x: 570, y: 320 }, details: { event: 'CHECK-IN', checkpoint: 'Delhi IGI', alert: 'Travel-time review' } },
      { id: 'travel-3', type: 'travel', severity: 'normal', label: 'Mumbai Airport', subtitle: 'Exit · 20:10 IST', position: { x: 850, y: 300 }, details: { event: 'EXIT', checkpoint: 'Mumbai Airport' } }
    ],
    edges: [
      { id: 'e1', source: 'face-current', target: 'identity-current', type: 'MATCHES_IDENTITY', severity: 'normal', label: 'session' },
      { id: 'e2', source: 'identity-current', target: 'aadhaar-demo', type: 'IDENTITY_REFERENCE', severity: 'critical', label: 'conflict' },
      { id: 'e3', source: 'identity-current', target: 'document-current', type: 'PRESENTED_DOCUMENT', severity: 'normal', label: 'current' },
      { id: 'e4', source: 'document-current', target: 'document-prior', type: 'DOCUMENT_REUSE', severity: 'critical', label: 'reuse' },
      { id: 'e5', source: 'identity-current', target: 'travel-1', type: 'TRAVEL_EVENT', severity: 'normal', label: 'entry' },
      { id: 'e6', source: 'travel-1', target: 'travel-2', type: 'IMPOSSIBLE_TRAVEL', severity: 'critical', label: 'time', displayLabel: '' },
      { id: 'e7', source: 'travel-2', target: 'travel-3', type: 'TRAVEL_EVENT', severity: 'normal', label: 'exit' }
    ]
  }
}
