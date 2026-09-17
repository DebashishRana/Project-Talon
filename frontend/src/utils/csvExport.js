function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function sessionsToCsv(sessions) {
  const headers = [
    'Session ID',
    'Created At',
    'Subject',
    'Nationality',
    'Document Type',
    'Document Number',
    'Status',
    'Risk Level',
    'Risk Score',
    'Officer',
    'Checkpoint',
    'CSII Status',
    'CSII Anomalies'
  ]
  const rows = sessions.map(session => [
    session.id,
    session.createdAt,
    session.subjectNameMasked,
    session.subjectNationality,
    session.documentType,
    session.documentNumberMasked,
    session.status,
    session.riskLevel,
    session.riskScore,
    session.officerName,
    session.checkpointName,
    session.csiiStatus,
    session.csiiAnomalies.join('; ')
  ])
  return [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n')
}

export function exportSessionsCsv(sessions, filename = 'talon-verification-sessions.csv') {
  const blob = new Blob([sessionsToCsv(sessions)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
