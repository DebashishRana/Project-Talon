export function maskName(fullName) {
  const parts = String(fullName || '').trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'UNKNOWN ****'
  if (parts.length === 1) return `${parts[0].slice(0, 3)}****`
  return `${parts[0]} ${parts[parts.length - 1][0]}****`
}

export function maskDob(dob) {
  const value = String(dob || '').trim()
  const iso = value.match(/^(\d{4})-\d{2}-\d{2}$/)
  if (iso) return `${iso[1]}-**-**`
  const mrz = value.match(/^(\d{2})(\d{2})(\d{2})$/)
  if (mrz) return `**${mrz[1]}-**-**`
  const year = value.match(/^(\d{4})/)
  return `${year?.[1] || '****'}-**-**`
}

export function maskDocumentNumber(docNum) {
  const value = String(docNum || '')
  if (!value) return '***'
  if (value.length < 6) return value.length <= 2 ? '***' : `${value.slice(0, 1)}***${value.slice(-1)}`
  return `${value.slice(0, 3)}****${value.slice(-1)}`
}

export function maskEmail(email) {
  const [local = '', domain = 'unknown.local'] = String(email || '').split('@')
  return `${local.slice(0, 7)}****@${domain}`
}
