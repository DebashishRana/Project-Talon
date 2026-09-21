import { DEFAULT_CHECKPOINTS, getSessionCheckpoint, resolveCheckpoint } from '../data/checkpoints.js'

const DAY = 86400000
const HOUR = 3600000
const IST_OFFSET = 330 * 60000
const RANGE_DAYS = { day: 1, week: 7, month: 30, year: 365 }
const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })

export function indiaDate(value = new Date()) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? new Date(timestamp + IST_OFFSET).toISOString().slice(0, 10) : ''
}

function midnight(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN
  const timestamp = Date.parse(`${date}T00:00:00+05:30`)
  return indiaDate(timestamp) === date ? timestamp : NaN
}

export function analyticsPeriod({ range = 'week', from = '', to = '', now = new Date() } = {}) {
  const today = indiaDate(now)
  let end = midnight(today) + DAY
  let start = end - (RANGE_DAYS[range] || 7) * DAY
  if (range === 'custom') {
    start = midnight(from)
    end = midnight(to) + DAY
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('Select a valid start and end date.')
    if (end <= start) throw new Error('End date must be on or after start date.')
    if (to > today) throw new Error('End date cannot be in the future.')
    if ((end - start) / DAY > 1827) throw new Error('Select a date range of five years or less.')
  }
  const duration = end - start
  const dayCount = duration / DAY
  const label = (a, b) => `${dateFormatter.format(a)} - ${dateFormatter.format(b - 1)}`
  return {
    start: indiaDate(start), end: indiaDate(end - 1),
    previousStart: indiaDate(start - duration), previousEnd: indiaDate(start - 1),
    startTime: start, endTime: end, previousStartTime: start - duration,
    label: label(start, end), previousLabel: label(start - duration, start),
    dayCount, bucketUnit: dayCount === 1 ? 'hour' : dayCount <= 62 ? 'day' : 'month'
  }
}

export function accessibleSessions(sessions, user, role, checkpoints = DEFAULT_CHECKPOINTS) {
  if (!user || user.status !== 'ACTIVE' || user.roleId !== role?.id) return []
  if (role.id !== 'super_admin' && !role.permissions?.some(item => item.module === 'analytics' && item.read)) return []
  const scope = role.id === 'super_admin' ? 'all' : role.dataScope
  if (scope === 'all' || scope === 'organization') return sessions
  if (scope === 'own') return sessions.filter(session => session.officerId === user.id)
  if (scope === 'checkpoint') {
    const assigned = resolveCheckpoint(user.checkpointId, checkpoints)
    if (!assigned) return []
    return sessions.filter(session => getSessionCheckpoint(session, checkpoints).id === assigned.id)
  }
  return []
}

function countSessions(sessions) {
  return sessions.reduce((counts, session) => {
    counts.total++
    if (session.status === 'VERIFIED') counts.verified++
    if (session.status === 'REJECTED') counts.rejected++
    if (['PENDING', 'PROCESSING', 'MANUAL_REVIEW', 'FLAGGED'].includes(session.status)) counts.pending++
    return counts
  }, { total: 0, verified: 0, rejected: 0, pending: 0 })
}

const rate = counts => counts.total ? counts.rejected / counts.total * 100 : 0
const percentChange = (value, previous) => previous ? (value - previous) / previous * 100 : value ? null : 0

function buildBuckets(period) {
  const buckets = []
  const step = period.bucketUnit === 'hour' ? HOUR : DAY
  for (let timestamp = period.startTime; timestamp < period.endTime; timestamp += step) {
    const date = indiaDate(timestamp)
    const key = period.bucketUnit === 'month' ? date.slice(0, 7) : period.bucketUnit === 'hour' ? `${date}-${timestamp}` : date
    const last = buckets[buckets.length - 1]
    if (last?.key === key) { last.end = timestamp + step; continue }
    const label = period.bucketUnit === 'hour'
      ? `${String(new Date(timestamp + IST_OFFSET).getUTCHours()).padStart(2, '0')}:00`
      : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', ...(period.bucketUnit === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }) }).format(timestamp)
    buckets.push({ key, date, label, start: timestamp, end: timestamp + step })
  }
  return buckets
}

export function buildAnalytics({ sessions = [], checkpoints = DEFAULT_CHECKPOINTS, user, role, now = new Date(), stateCode = '', checkpointId = '', ...filters } = {}) {
  let period
  try { period = analyticsPeriod({ ...filters, now }) } catch (error) { return { error: error.message } }
  const selectedCheckpoint = resolveCheckpoint(checkpointId, checkpoints)?.id || checkpointId
  const unique = new Map()
  // Session edits change the outcome of the original session, not its creation date.
  for (const session of accessibleSessions(sessions, user, role, checkpoints)) {
    const timestamp = Date.parse(session.createdAt)
    if (!session.id || !Number.isFinite(timestamp) || timestamp > new Date(now).getTime()) continue
    const previous = unique.get(session.id)
    if (!previous || Date.parse(session.updatedAt || session.createdAt) > Date.parse(previous.updatedAt || previous.createdAt)) unique.set(session.id, session)
  }
  const filtered = [...unique.values()].filter(session => {
    const location = getSessionCheckpoint(session, checkpoints)
    return (!stateCode || location.stateCode === stateCode) && (!selectedCheckpoint || location.id === selectedCheckpoint)
  })
  const current = filtered.filter(session => Date.parse(session.createdAt) >= period.startTime && Date.parse(session.createdAt) < period.endTime)
  const previous = filtered.filter(session => Date.parse(session.createdAt) >= period.previousStartTime && Date.parse(session.createdAt) < period.startTime)
  const totals = countSessions(current)
  const previousTotals = countSessions(previous)
  const positive = totals.verified / period.dayCount
  const previousPositive = previousTotals.verified / period.dayCount
  const duration = period.endTime - period.startTime
  const buckets = buildBuckets(period)
  const series = buckets.map(bucket => {
    const counts = countSessions(current.filter(session => Date.parse(session.createdAt) >= bucket.start && Date.parse(session.createdAt) < bucket.end))
    const prior = countSessions(previous.filter(session => Date.parse(session.createdAt) >= bucket.start - duration && Date.parse(session.createdAt) < bucket.end - duration))
    const days = period.bucketUnit === 'month' ? (bucket.end - bucket.start) / DAY : 1
    return { date: bucket.date, label: bucket.label, total: counts.total, positive: counts.verified / days, rejection: rate(counts), previousTotal: prior.total, previousPositive: prior.verified / days, previousRejection: rate(prior) }
  })
  const checkpointCounts = new Map()
  const dailyCounts = new Map()
  for (const session of current) {
    const checkpoint = getSessionCheckpoint(session, checkpoints)
    const entry = checkpointCounts.get(checkpoint.id) || { ...checkpoint, total: 0, verified: 0, rejected: 0 }
    entry.total++
    if (session.status === 'VERIFIED') entry.verified++
    if (session.status === 'REJECTED') entry.rejected++
    checkpointCounts.set(checkpoint.id, entry)
    const date = indiaDate(session.createdAt)
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
  }
  const firstWeekday = (new Date(period.startTime + IST_OFFSET).getUTCDay() + 6) % 7
  const heatmap = Array.from({ length: period.dayCount }, (_, index) => {
    const date = indiaDate(period.startTime + index * DAY)
    return { date, count: dailyCounts.get(date) || 0, weekday: (firstWeekday + index) % 7, week: Math.floor((firstWeekday + index) / 7) }
  })
  return {
    error: '', period, totals, previousTotals, series, heatmap,
    metrics: {
      total: { value: totals.total, previous: previousTotals.total, change: percentChange(totals.total, previousTotals.total) },
      positive: { value: positive, previous: previousPositive, change: percentChange(positive, previousPositive) },
      rejection: { value: rate(totals), previous: rate(previousTotals), change: previousTotals.total ? rate(totals) - rate(previousTotals) : null }
    },
    checkpointSeries: [...checkpointCounts.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    unmappedCount: current.filter(session => !getSessionCheckpoint(session, checkpoints).stateCode).length
  }
}

export function analyticsToCsv(data, { stateName = 'All states', checkpointName = 'All checkpoints' } = {}) {
  if (data.error) return ''
  const rows = [
    ['TALON operational analytics', 'Asia/Kolkata'], ['Period', data.period.label],
    ['State', stateName], ['Checkpoint', checkpointName], ['Source', 'Recorded sessions in this browser'],
    ['Total sessions', data.totals.total], ['Average verified sessions per day', data.metrics.positive.value],
    ['Rejection percentage', data.metrics.rejection.value], [],
    ['Period', 'Sessions', 'Verified per bucket (monthly: daily average)', 'Rejection %', 'Previous sessions', 'Previous verified per bucket', 'Previous rejection %'],
    ...data.series.map(item => [item.label, item.total, item.positive, item.rejection, item.previousTotal, item.previousPositive, item.previousRejection]), [],
    ['Checkpoint', 'State', 'Sessions', 'Verified', 'Rejected'],
    ...data.checkpointSeries.map(item => [item.name, item.stateCode, item.total, item.verified, item.rejected]), [],
    ['Date (IST)', 'Sessions'], ...data.heatmap.map(item => [item.date, item.count])
  ]
  return rows.map(row => row.map(value => {
    let text = String(value ?? '')
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
}
