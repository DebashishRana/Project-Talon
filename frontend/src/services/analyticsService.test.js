import test from 'node:test'
import assert from 'node:assert/strict'
import { INDIA_STATES, DEFAULT_CHECKPOINTS, canManageCheckpoints, getSessionCheckpoint, resolveCheckpoint, validateCheckpoint } from '../data/checkpoints.js'
import { analyticsPeriod, analyticsToCsv, buildAnalytics, indiaDate } from './analyticsService.js'
import { newSessionStore } from '../store/newSessionStore.js'

const user = { id: 'admin-1', status: 'ACTIVE', roleId: 'super_admin' }
const role = { id: 'super_admin', dataScope: 'all' }
const now = new Date('2026-09-21T12:00:00+05:30')
const session = (id, createdAt, status = 'VERIFIED', extra = {}) => ({ id, createdAt, status, officerId: 'officer-1', checkpointId: 'checkpoint-raxaul', ...extra })
const report = (sessions = [], filters = {}) => buildAnalytics({ sessions, user, role, now, ...filters })

test('empty report has zero real activity and preserves all calendar buckets', () => {
  const data = report()
  assert.equal(data.totals.total, 0)
  assert.equal(data.metrics.positive.value, 0)
  assert.equal(data.series.length, 7)
  assert.equal(data.heatmap.length, 7)
  assert.equal(data.checkpointSeries.length, 0)
  assert.ok(data.series.every(item => item.total === 0 && item.previousTotal === 0))
})

test('IST day boundaries include midnight and exclude preceding or future records', () => {
  const data = report([
    session('before', '2026-09-20T18:29:59.999Z'),
    session('midnight', '2026-09-20T18:30:00Z'),
    session('now', now.toISOString()),
    session('future', '2026-09-21T18:29:59Z'),
    session('tomorrow', '2026-09-21T18:30:00Z'),
    session('invalid', 'not-a-date')
  ], { range: 'day' })
  assert.equal(data.totals.total, 2)
  assert.equal(data.previousTotals.total, 1)
  assert.equal(data.series.length, 24)
  assert.equal(data.series[0].total, 1)
  assert.equal(data.series[12].total, 1)
  assert.equal(data.heatmap[0].date, '2026-09-21')
})

test('positive daily average includes zero days; rejection is weighted across all sessions', () => {
  const records = Array.from({ length: 8 }, (_, index) => session(`positive-${index}`, '2026-09-20T12:00:00+05:30'))
  records.push(session('reject-1', '2026-09-21T09:00:00+05:30', 'REJECTED'))
  records.push(session('reject-2', '2026-09-21T10:00:00+05:30', 'REJECTED'))
  const data = report(records)
  assert.equal(data.metrics.positive.value, 8 / 7)
  assert.equal(data.metrics.rejection.value, 20)
  assert.equal(data.series.at(-1).rejection, 100)
  assert.equal(data.heatmap.reduce((sum, day) => sum + day.count, 0), 10)
})

test('pending, cancelled, flagged and manual review are not successes or rejections', () => {
  const data = report(['PENDING', 'PROCESSING', 'CANCELLED', 'FLAGGED', 'MANUAL_REVIEW'].map(status => session(status, now.toISOString(), status)))
  assert.deepEqual(data.totals, { total: 5, verified: 0, rejected: 0, pending: 4 })
  assert.equal(data.metrics.rejection.value, 0)
})

test('previous period has equal duration, no overlap, and identical location filters', () => {
  const data = report([
    session('p1', '2026-09-08T00:00:00+05:30', 'REJECTED'),
    session('p2', '2026-09-14T23:59:59+05:30'),
    session('current', '2026-09-15T00:00:00+05:30'),
    session('other-state', '2026-09-13T00:00:00+05:30', 'VERIFIED', { checkpointId: 'checkpoint-sonauli' }),
    session('too-old', '2026-09-07T23:59:59+05:30')
  ], { stateCode: 'BR' })
  assert.equal(data.totals.total, 1)
  assert.equal(data.previousTotals.total, 2)
  assert.equal(data.metrics.total.change, -50)
  assert.equal(data.metrics.rejection.change, -50)
  assert.equal(data.period.previousStart, '2026-09-08')
  assert.equal(data.period.previousEnd, '2026-09-14')
})

test('zero previous activity has no fabricated growth percentage', () => {
  const data = report([session('new', now.toISOString())])
  assert.equal(data.metrics.total.change, null)
  assert.equal(data.metrics.positive.change, null)
  assert.equal(data.metrics.rejection.change, null)
})

test('legacy names, stable IDs and custom checkpoints all filter by state and checkpoint', () => {
  const checkpoints = [...DEFAULT_CHECKPOINTS, { id: 'custom-one', name: 'Custom Gate', stateCode: 'KA' }]
  const sessions = [session('old', now.toISOString(), 'VERIFIED', { checkpointId: 'Raxaul' }), session('new', now.toISOString()), session('custom', now.toISOString(), 'REJECTED', { checkpointId: 'custom-one' })]
  assert.equal(report(sessions, { checkpointId: 'checkpoint-raxaul', checkpoints }).totals.total, 2)
  assert.equal(report(sessions, { checkpointId: 'Raxaul', checkpoints }).totals.total, 2)
  assert.equal(report(sessions, { stateCode: 'KA', checkpoints }).totals.rejected, 1)
  assert.equal(report(sessions, { stateCode: 'BR', checkpointId: 'custom-one', checkpoints }).totals.total, 0)
})

test('unknown states remain unmapped and stored session locations remain historical', () => {
  const sessions = [session('unknown', now.toISOString(), 'VERIFIED', { checkpointId: 'old-unknown' }), session('snapshot', now.toISOString(), 'VERIFIED', { checkpointStateCode: 'KA' })]
  assert.equal(report(sessions).unmappedCount, 1)
  assert.equal(report(sessions, { stateCode: 'KA' }).totals.total, 1)
  assert.equal(report(sessions, { stateCode: 'BR' }).totals.total, 0)
  assert.equal(getSessionCheckpoint(sessions[0]).stateCode, '')
})

test('role scope is applied before requested filters and comparisons', () => {
  const sessions = [session('mine', now.toISOString()), session('same-gate', now.toISOString(), 'REJECTED', { officerId: 'officer-2' }), session('elsewhere', now.toISOString(), 'VERIFIED', { officerId: 'officer-2', checkpointId: 'Sonauli' })]
  const restricted = { id: 'reviewer', dataScope: 'own', permissions: [{ module: 'analytics', read: true }] }
  const reviewer = { id: 'officer-1', status: 'ACTIVE', roleId: 'reviewer', checkpointId: 'Raxaul' }
  assert.equal(report(sessions, { user: reviewer, role: restricted }).totals.total, 1)
  assert.equal(report(sessions, { user: reviewer, role: { ...restricted, dataScope: 'checkpoint' } }).totals.total, 2)
  assert.equal(report(sessions, { user: reviewer, role: restricted, checkpointId: 'Sonauli' }).totals.total, 0)
  assert.equal(report(sessions, { user: { ...reviewer, checkpointId: '' }, role: { ...restricted, dataScope: 'checkpoint' } }).totals.total, 0)
  assert.equal(report(sessions, { user: { ...reviewer, status: 'SUSPENDED' }, role: restricted }).totals.total, 0)
  assert.equal(report(sessions, { user: reviewer, role: { ...restricted, permissions: [] } }).totals.total, 0)
  assert.equal(report(sessions, { role: undefined }).totals.total, 0)
  assert.equal(report(sessions, { user: { ...reviewer, roleId: 'auditor' }, role: { id: 'auditor', dataScope: 'all', permissions: [{ module: 'analytics', read: true }] } }).totals.total, 3)
})

test('edited outcomes replace duplicate IDs without adding another session', () => {
  const data = report([
    session('same', '2026-09-20T12:00:00+05:30', 'PENDING'),
    session('same', '2026-09-20T12:00:00+05:30', 'REJECTED', { updatedAt: now.toISOString() })
  ])
  assert.equal(data.totals.total, 1)
  assert.equal(data.totals.rejected, 1)
})

test('month and year buckets remain chronological and retain every session', () => {
  assert.equal(report([], { range: 'month' }).period.dayCount, 30)
  const sessions = [session('old', '2025-10-01T00:00:00+05:30'), session('new', '2026-09-20T00:00:00+05:30')]
  const data = report(sessions, { range: 'year' })
  assert.equal(data.period.dayCount, 365)
  assert.equal(data.period.bucketUnit, 'month')
  assert.equal(data.series.reduce((sum, item) => sum + item.total, 0), 2)
  assert.equal(data.heatmap.length, 365)
  assert.ok(data.series.every((item, index) => !index || item.date > data.series[index - 1].date))
})

test('custom dates are inclusive and impossible, reversed or future dates are rejected', () => {
  const data = report([session('end', '2026-09-19T23:59:59.999+05:30'), session('next', '2026-09-20T00:00:00+05:30')], { range: 'custom', from: '2026-09-18', to: '2026-09-19' })
  assert.equal(data.totals.total, 1)
  assert.equal(data.period.dayCount, 2)
  for (const [from, to] of [['', ''], ['2026-02-30', '2026-03-01'], ['2026-09-21', '2026-09-20'], ['2026-09-21', '2026-09-22'], ['2010-01-01', '2026-01-01']]) {
    assert.ok(report([], { range: 'custom', from, to }).error)
  }
  assert.equal(analyticsPeriod({ range: 'custom', from: '2024-02-28', to: '2024-03-01', now }).dayCount, 3)
})

test('heatmap weekdays and week columns follow the calendar', () => {
  const data = report([], { range: 'custom', from: '2026-09-19', to: '2026-09-21' })
  assert.deepEqual(data.heatmap.map(({ weekday, week }) => [weekday, week]), [[5, 0], [6, 0], [0, 1]])
  assert.equal(indiaDate('2026-09-20T20:00:00Z'), '2026-09-21')
})

test('catalog covers all 28 states and preserves original checkpoint aliases', () => {
  assert.equal(INDIA_STATES.length, 28)
  assert.equal(new Set(INDIA_STATES.map(item => item.code)).size, 28)
  assert.equal(new Set(DEFAULT_CHECKPOINTS.map(item => item.id)).size, DEFAULT_CHECKPOINTS.length)
  assert.ok(DEFAULT_CHECKPOINTS.length >= 40)
  assert.equal(new Set(DEFAULT_CHECKPOINTS.map(item => item.stateCode)).size, 28)
  for (const name of ['Raxaul', 'Jhulaghat', 'Haldwani', 'Bagdogra', 'Panitanki', 'Jogbani', 'Sonauli']) assert.ok(resolveCheckpoint(name))
  assert.equal(resolveCheckpoint(' rAxAuL ').stateCode, 'BR')
})

test('custom checkpoint validation requires a state and rejects duplicates in that state', () => {
  assert.deepEqual(validateCheckpoint({ name: ' New   Gate ', stateCode: 'BR' }), { name: 'New Gate', stateCode: 'BR' })
  assert.throws(() => validateCheckpoint({ name: ' rAxAuL ', stateCode: 'BR' }), /already exists/)
  assert.throws(() => validateCheckpoint({ name: 'Gate', stateCode: 'XX' }), /valid state/)
  assert.throws(() => validateCheckpoint({ name: ' ', stateCode: 'BR' }), /between/)
  assert.throws(() => validateCheckpoint({ name: 'A'.repeat(81), stateCode: 'BR' }), /between/)
  assert.equal(validateCheckpoint({ name: 'Raxaul', stateCode: 'KA' }).stateCode, 'KA')
})

test('auditors cannot manage checkpoints while authorized administrators can', () => {
  assert.equal(canManageCheckpoints(user, role), true)
  assert.equal(canManageCheckpoints({ ...user, roleId: 'auditor' }, { id: 'auditor', permissions: [{ module: 'settings', create: true }] }), false)
  assert.equal(canManageCheckpoints({ ...user, status: 'SUSPENDED' }, role), false)
  assert.equal(canManageCheckpoints({ ...user, roleId: 'manager' }, { id: 'manager', permissions: [{ module: 'user_access', update: true }] }), true)
})

test('CSV matches filtered counts, excludes model mockup and escapes spreadsheet formulas', () => {
  const data = report([session('one', now.toISOString())])
  const csv = analyticsToCsv(data, { checkpointName: '=DANGEROUS()', stateName: 'Bihar' })
  assert.ok(csv.includes('"Total sessions","1"'))
  assert.ok(csv.includes('"\'=DANGEROUS()"'))
  assert.ok(!csv.includes('97.8'))
  assert.ok(csv.includes('"2026-09-21","1"'))
})

test('new session retains the authorized checkpoint through processing and resets it afterwards', () => {
  newSessionStore.reset()
  newSessionStore.setOfficer({ officerId: 'officer-1', officerEmail: 'officer@ssb.gov.in', checkpoint: { id: 'custom-one', name: 'Custom Gate', stateCode: 'KA' } })
  newSessionStore.setDocument('PASSPORT', { code: 'IN', iso3: 'IND', name: 'India' })
  newSessionStore.setProcessingResult({ status: 'VERIFIED' })
  assert.equal(newSessionStore.getSnapshot().checkpointId, 'custom-one')
  assert.equal(newSessionStore.getSnapshot().checkpointName, 'Custom Gate')
  assert.equal(newSessionStore.getSnapshot().checkpointStateCode, 'KA')
  newSessionStore.reset()
  assert.equal(newSessionStore.getSnapshot().checkpointId, '')
  assert.equal(newSessionStore.getSnapshot().checkpointStateCode, '')
})
