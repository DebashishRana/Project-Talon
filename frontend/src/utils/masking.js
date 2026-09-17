export function maskName(fullName) {
  const parts = String(fullName || '').trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'UNKNOWN ****'
  if (parts.length === 1) return `${parts[0].slice(0, 3)}****`
  return `${parts[0]} ${parts[parts.length - 1][0]}****`
}

export function maskDob(dob) {
  const [year] = String(dob || '').split('-')
  return `${year || '0000'}-**-**`
}

export function maskDocumentNumber(docNum) {
  const value = String(docNum || '')
  if (value.length < 6) return value || '***'
  return `${value.slice(0, 3)}****${value.slice(-1)}`
}

export function maskEmail(email) {
  const [local = '', domain = 'unknown.local'] = String(email || '').split('@')
  return `${local.slice(0, 7)}****@${domain}`
}
