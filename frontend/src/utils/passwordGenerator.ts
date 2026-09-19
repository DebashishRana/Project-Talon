const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function pick(source: string) {
  const array = new Uint32Array(1)
  window.crypto?.getRandomValues(array)
  return source[array[0] % source.length]
}

export function generateSecurePassword(length = 16) {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(ALL))
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('')
}
