const AUTH_HASH_PREFIX = 'talon-auth-v1:'

export const DEFAULT_SUPER_ADMIN_EMAIL = 'admin@ssb.gov.in'
export const DEFAULT_SUPER_ADMIN_PASSWORD = 'Talon@Admin2026!'
export const SUPER_ADMIN_PASSWORD_HASH = '7f3bc1d0769af9c710826dba0a60fa20aa776ee2fb8d613f678242820a67f264'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string) {
  const source = new TextEncoder().encode(`${AUTH_HASH_PREFIX}${password}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', source)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
