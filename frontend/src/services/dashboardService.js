import { sessionStore } from '../store/sessionStore'

const RANGE_DAYS = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '12m': 365
}

const TYPE_LABELS = {
  PASSPORT: 'Passport',
  VISA: 'Visa',
  AADHAAR: 'Aadhaar',
  PAN: 'PAN',
  DRIVING_LICENSE: 'Driving License',
  NATIONAL_PERMIT: 'National Permit',
  PERMIT: 'Permit'
}

const statusMap = {
  VERIFIED: 'approved',
  PENDING: 'pending',
  PROCESSING: 'pending',
  MANUAL_REVIEW: 'pending',
  FLAGGED: 'flagged',
  REJECTED: 'rejected',
  CANCELLED: 'rejected'
}

let developmentRecords = null

function sleep(ms = 180) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function isoDaysAgo(days, hour = 10) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, (days * 7) % 60, 0, 0)
  return date.toISOString()
}

function makeDevelopmentRecords() {
  if (developmentRecords) return developmentRecords
  const names = [
    ['James Brown', 'Passport', 'approved', 98.4, 97.1, 'AWS Rekognition'],
    ['Sarah Tom Lee', 'Passport', 'approved', 94.2, 95.8, 'Booking.com API'],
    ['Michael Chen', 'Aadhaar', 'pending', 82.5, 88.2, 'Expedia'],
    ['Emily Davis', 'Visa', 'flagged', 71.8, 78.4, 'Direct'],
    ['Noah Wilson', 'Passport', 'approved', 96.2, 93.4, 'AWS Rekognition'],
    ['Olivia Martin', 'PAN', 'approved', null, null, 'Operator upload'],
    ['Liam Thompson', 'Passport', 'pending', 89.9, 92.2, 'Expedia'],
    ['Ava Rodriguez', 'Permit', 'approved', 91.2, 90.4, 'Walk-in'],
    ['Ethan Brooks', 'Passport', 'flagged', 63.4, 66.8, 'Direct'],
    ['Mia Kapoor', 'Aadhaar', 'rejected', 52.1, 48.5, 'Manual review'],
    ['Arjun Mehta', 'Passport', 'approved', 97.6, 98.1, 'Direct'],
    ['Nora Singh', 'Visa', 'pending', 84.3, 86.9, 'Operator upload']
  ]

  developmentRecords = names.map(([userName, verificationType, status, matchScore, livenessScore, source], index) => ({
    id: `VR-${String(5105 + index).padStart(5, '0')}`,
    userName,
    userId: `USR-${String(8000 + index)}`,
    verificationType,
    sessionId: `TALON-${String(20260920 - index)}-${String(index + 1).padStart(3, '0')}`,
    submittedAt: isoDaysAgo(index % 16, 8 + (index % 9)),
    matchScore,
    livenessScore,
    livenessStatus: livenessScore == null ? 'unknown' : livenessScore >= 80 ? 'pass' : 'fail',
    source,
    status,
    reviewNotes: status === 'flagged' ? 'Supervisor review required for biometric or document inconsistency.' : null,
    createdAt: isoDaysAgo(index % 16, 8 + (index % 9)),
    updatedAt: isoDaysAgo(index % 7, 14 + (index % 5)),
    evidence: {
      capturedSelfie: null,
      referenceImage: null,
      documentImage: null
    },
    eventHistory: [
      { id: `evt-${index}-submitted`, eventType: 'Verification submitted', timestamp: isoDaysAgo(index % 16, 8 + (index % 9)), status: 'pending' },
      { id: `evt-${index}-face`, eventType: 'Face match completed', timestamp: isoDaysAgo(index % 16, 9 + (index % 8)), status: matchScore && matchScore >= 90 ? 'approved' : 'flagged' },
      { id: `evt-${index}-status`, eventType: status === 'approved' ? 'Verification approved' : status === 'rejected' ? 'Verification rejected' : status === 'flagged' ? 'Verification flagged' : 'Manual review queued', timestamp: isoDaysAgo(index % 7, 14 + (index % 5)), status }
    ]
  }))
  return developmentRecords
}

function mapSessionToRecord(session) {
  const verificationType = TYPE_LABELS[session.documentType] || String(session.documentType || 'Identity')
  const status = statusMap[session.status] || 'pending'
  return {
    id: session.id,
    userName: session.subjectNameMasked || 'Unknown subject',
    userId: session.faceHash || session.id,
    sessionId: session.id,
    verificationType,
    submittedAt: session.createdAt,
    matchScore: typeof session.faceMatch === 'number' ? session.faceMatch : null,
    livenessScore: session.liveFaceBase64 ? 96 : null,
    livenessStatus: session.liveFaceBase64 ? 'pass' : 'unknown',
    source: session.checkpointName || session.officerName || 'TALON',
    status,
    reviewNotes: session.declineReason || session.notes || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt || session.createdAt,
    evidence: {
      capturedSelfie: session.liveFaceBase64 || null,
      referenceImage: session.documentFaceBase64 || null,
      documentImage: session.documentFrontBase64 || null
    },
    eventHistory: [
      { id: `${session.id}-submitted`, eventType: 'Verification submitted', timestamp: session.createdAt, status: 'pending' },
      ...(session.pipeline || []).map((stage, index) => ({
        id: `${session.id}-${stage.stage}-${index}`,
        eventType: `${String(stage.stage).replaceAll('_', ' ')} ${String(stage.status).toLowerCase()}`,
        timestamp: session.updatedAt || session.createdAt,
        status
      }))
    ]
  }
}

function allRecords() {
  const sessions = sessionStore.getSnapshot().sessions
  const records = sessions.map(mapSessionToRecord)
  return records.length ? records : makeDevelopmentRecords()
}

function rangeBounds(params = {}) {
  if (params.startDate || params.endDate) {
    return {
      start: params.startDate ? new Date(`${params.startDate}T00:00:00`) : new Date(0),
      end: params.endDate ? new Date(`${params.endDate}T23:59:59`) : new Date()
    }
  }
  const days = RANGE_DAYS[params.range] || 7
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - days)
  return { start, end }
}

function inRange(record, params) {
  const { start, end } = rangeBounds(params)
  const submitted = new Date(record.submittedAt)
  return submitted >= start && submitted <= end
}

function matchesSearch(record, query) {
  const normalized = String(query || '').trim().toLowerCase()
  if (!normalized) return true
  return [
    record.userName,
    record.id,
    record.sessionId,
    record.source,
    record.verificationType
  ].some(value => String(value || '').toLowerCase().includes(normalized))
}

function sortRecords(records, sortBy = 'submittedAt', direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1
  return [...records].sort((left, right) => {
    let a = left[sortBy]
    let b = right[sortBy]
    if (sortBy === 'submittedAt') {
      a = new Date(a).getTime()
      b = new Date(b).getTime()
    }
    if (a == null) return 1
    if (b == null) return -1
    if (a > b) return multiplier
    if (a < b) return -multiplier
    return 0
  })
}

function filteredRecords(params = {}) {
  return allRecords().filter(record => (
    inRange(record, params) &&
    matchesSearch(record, params.search) &&
    (!params.status || record.status === params.status) &&
    (!params.verificationType || record.verificationType === params.verificationType)
  ))
}

function previousPeriodRecords(params = {}) {
  const current = rangeBounds(params)
  const length = current.end.getTime() - current.start.getTime()
  const end = new Date(current.start.getTime())
  const start = new Date(end.getTime() - length)
  return allRecords().filter(record => {
    const submitted = new Date(record.submittedAt)
    return submitted >= start && submitted < end
  })
}

function buildSummary(records, previousRecords) {
  const totalRequests = records.length
  const successfulVerifications = records.filter(record => record.status === 'approved').length
  const manualReviewCases = records.filter(record => record.status === 'flagged' || record.status === 'pending').length
  const rejectedDocuments = records.filter(record => record.status === 'rejected').length
  const pendingCount = records.filter(record => record.status === 'pending').length
  const flaggedCount = records.filter(record => record.status === 'flagged').length
  const approvalRate = totalRequests ? Math.round((successfulVerifications / totalRequests) * 1000) / 10 : 0
  const previousTotal = previousRecords.length
  const trendVsPreviousPeriod = previousTotal ? Math.round(((totalRequests - previousTotal) / previousTotal) * 1000) / 10 : totalRequests ? 100 : 0
  const percentChange = (current, previous) => previous ? Math.round(((current - previous) / previous) * 1000) / 10 : current ? 100 : 0
  const previousApproved = previousRecords.filter(record => record.status === 'approved').length
  const previousManualReview = previousRecords.filter(record => record.status === 'flagged' || record.status === 'pending').length
  const previousRejected = previousRecords.filter(record => record.status === 'rejected').length
  return {
    totalRequests,
    successfulVerifications,
    manualReviewCases,
    rejectedDocuments,
    approvalRate,
    pendingCount,
    flaggedCount,
    trendVsPreviousPeriod,
    approvedTrend: percentChange(successfulVerifications, previousApproved),
    manualReviewTrend: percentChange(manualReviewCases, previousManualReview),
    rejectedTrend: percentChange(rejectedDocuments, previousRejected)
  }
}

function bucketKey(date, range) {
  const value = new Date(date)
  if (range === '24h') return `${String(value.getHours()).padStart(2, '0')}:00`
  if (range === '12m') return value.toLocaleString('en-IN', { month: 'short' })
  return value.toLocaleString('en-IN', { day: '2-digit', month: 'short' })
}

function buildChart(records, params = {}) {
  const range = params.range || '7d'
  const buckets = new Map()
  records.forEach(record => {
    const key = bucketKey(record.submittedAt, range)
    const current = buckets.get(key) || { period: key, total: 0, approved: 0, flagged: 0 }
    current.total += 1
    if (record.status === 'approved') current.approved += 1
    if (record.status === 'flagged' || record.status === 'rejected') current.flagged += 1
    buckets.set(key, current)
  })
  return Array.from(buckets.values()).slice(-14)
}

function buildActivities(records) {
  return records.flatMap(record => {
    const history = record.eventHistory?.length ? record.eventHistory : []
    return history.map(event => ({
      id: event.id,
      verificationId: record.id,
      userName: record.userName,
      eventType: event.eventType,
      timestamp: event.timestamp,
      source: record.source,
      status: event.status || record.status
    }))
  }).sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
}

function updateLocalSessionStatus(id, status, reviewNotes) {
  const reverseStatus = {
    approved: 'VERIFIED',
    pending: 'MANUAL_REVIEW',
    flagged: 'FLAGGED',
    rejected: 'REJECTED'
  }
  const session = sessionStore.getSessionById(id)
  if (!session) {
    const record = makeDevelopmentRecords().find(item => item.id === id)
    if (record) {
      record.status = status
      record.reviewNotes = reviewNotes || record.reviewNotes
      record.updatedAt = new Date().toISOString()
      record.eventHistory = [
        ...(record.eventHistory || []),
        { id: `${record.id}-${status}-${Date.now()}`, eventType: `Verification ${status}`, timestamp: new Date().toISOString(), status }
      ]
    }
    return
  }
  sessionStore.updateSession(id, {
    status: reverseStatus[status] || session.status,
    reviewNotes,
    notes: reviewNotes || session.notes,
    riskLevel: status === 'approved' ? 'LOW' : status === 'rejected' ? 'HIGH' : session.riskLevel,
    csiiStatus: status === 'flagged' ? 'MONITORING' : session.csiiStatus
  })
}

export const dashboardService = {
  async getDashboard(params = {}) {
    await sleep()
    const records = filteredRecords(params)
    const previous = previousPeriodRecords(params)
    const summary = buildSummary(records, previous)
    const chart = buildChart(records, params)
    const activities = buildActivities(records).filter(activity => matchesSearch({
      userName: activity.userName,
      id: activity.verificationId,
      sessionId: activity.verificationId,
      source: activity.source,
      verificationType: activity.eventType
    }, params.activitySearch)).slice(0, 12)
    return { summary, chart, activities }
  },
  async getVerifications(params = {}) {
    await sleep()
    const records = sortRecords(filteredRecords(params), params.sortBy, params.sortDirection)
    const page = Math.max(1, Number(params.page || 1))
    const limit = Math.max(5, Number(params.limit || 10))
    const start = (page - 1) * limit
    return {
      records: records.slice(start, start + limit),
      total: records.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(records.length / limit)),
      verificationTypes: Array.from(new Set(allRecords().map(record => record.verificationType))).sort()
    }
  },
  async getVerification(id) {
    await sleep(80)
    return allRecords().find(record => record.id === id || record.sessionId === id) || null
  },
  async updateVerificationStatus(id, status, reviewNotes = '') {
    await sleep(140)
    updateLocalSessionStatus(id, status, reviewNotes)
    return { success: true, id, status, reviewNotes, updatedAt: new Date().toISOString() }
  }
}
