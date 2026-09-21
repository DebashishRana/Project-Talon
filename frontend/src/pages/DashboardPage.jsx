import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck2, CheckCircle2, ClipboardList, Flag, Plus, Search } from 'lucide-react'
import ActivityItem from '../components/dashboard/ActivityItem'
import DashboardMetricCard from '../components/dashboard/DashboardMetricCard'
import DateRangeFilter from '../components/dashboard/DateRangeFilter'
import SearchInput from '../components/dashboard/SearchInput'
import VerificationChart from '../components/dashboard/VerificationChart'
import VerificationDetailsPanel from '../components/dashboard/VerificationDetailsPanel'
import VerificationTable from '../components/dashboard/VerificationTable'
import { EmptyState, ErrorState } from '../components/dashboard/StateMessages'
import { useDashboardData } from '../hooks/useDashboardData'
import { dashboardService } from '../services/dashboardService'
import { getDashboardPermissions } from '../utils/dashboardAuthorization'
import { useRBACStore } from '../store/rbacStore'
import './DashboardPage.css'
import './DashboardPageOverrides.css'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'rejected', label: 'Rejected' }
]

function formatCompact(value) {
  const number = Number(value || 0)
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`
  return String(number)
}

function metricData(summary) {
  const data = summary || {
    totalRequests: 0,
    successfulVerifications: 0,
    manualReviewCases: 0,
    rejectedDocuments: 0,
    approvalRate: 0,
    pendingCount: 0,
    flaggedCount: 0,
    trendVsPreviousPeriod: 0,
    approvedTrend: 0,
    manualReviewTrend: 0,
    rejectedTrend: 0
  }
  return [
    {
      title: 'Verification Requests',
      value: formatCompact(data.totalRequests),
      helper: `${data.pendingCount} pending`,
      trend: data.trendVsPreviousPeriod,
      tone: 'blue'
    },
    {
      title: 'Approved',
      value: formatCompact(data.successfulVerifications),
      helper: `${data.approvalRate}% approval rate`,
      trend: data.approvedTrend,
      tone: 'green'
    },
    {
      title: 'Manual Review',
      value: formatCompact(data.manualReviewCases),
      helper: `${data.flaggedCount} flagged`,
      trend: data.manualReviewTrend,
      tone: 'amber'
    },
    {
      title: 'Rejected Documents',
      value: formatCompact(data.rejectedDocuments),
      helper: 'rejected in this period',
      trend: data.rejectedTrend,
      tone: 'red'
    }
  ]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const currentUser = useRBACStore(state => state.users.find(user => user.id === state.currentUserId))
  const permissions = useMemo(() => getDashboardPermissions(currentUser?.roleId || 'operative'), [currentUser?.roleId])
  const [filters, setFilters] = useState({
    range: '7d',
    startDate: '',
    endDate: '',
    search: '',
    activitySearch: '',
    status: '',
    verificationType: '',
    sortBy: 'submittedAt',
    sortDirection: 'desc',
    page: 1,
    limit: 10
  })
  const [selectedRecord, setSelectedRecord] = useState(null)
  const { dashboard, table, loading, error, retry } = useDashboardData(filters)

  const updateFilters = patch => setFilters(current => ({ ...current, ...patch }))

  const changeSort = field => updateFilters({
    sortBy: field,
    sortDirection: filters.sortBy === field && filters.sortDirection === 'desc' ? 'asc' : 'desc',
    page: 1
  })

  const openRecord = async id => {
    const record = await dashboardService.getVerification(id)
    if (record) setSelectedRecord(record)
  }

  const runAction = async (action, record, reviewNotes = '') => {
    if (action === 'view' || action === 'review' || action === 'evidence') {
      setSelectedRecord(record)
      return
    }
    const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'flag' ? 'flagged' : record.status
    await dashboardService.updateVerificationStatus(record.id, nextStatus, reviewNotes || record.reviewNotes || '')
    const updated = await dashboardService.getVerification(record.id)
    setSelectedRecord(updated)
    await retry()
  }

  const metrics = metricData(dashboard.summary)

  return (
    <main className="verification-dashboard">
      <header className="vd-topbar">
        <div>
          <nav aria-label="Breadcrumb" className="vd-breadcrumb"><span>Overview</span><i />Dashboard</nav>
          <h1>Good Morning, {currentUser?.fullName || 'User'}</h1>
          <p>Here is today's snapshot of verification requests, identity decisions, and manual reviews.</p>
        </div>
        <div className="vd-top-actions">
          <button className="vd-icon-button" type="button" aria-label="Search dashboard"><Search size={16} /></button>
          <button className="vd-icon-button" type="button" aria-label="Notifications"><Bell size={16} /></button>
          <DateRangeFilter
            range={filters.range}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onChange={updateFilters}
          />
          <button className="vd-primary-button" type="button" disabled={!permissions.canInitiateVerification} onClick={() => navigate('/upload/authorize')}>
            <Plus size={16} /> New Verification
          </button>
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={retry} />}

      <section className="vd-metric-grid" aria-label="Dashboard summary metrics">
        {metrics.map(metric => <DashboardMetricCard {...metric} loading={loading} key={metric.title} />)}
      </section>

      <section className="vd-dashboard-grid">
        <article className="vd-panel vd-chart-panel">
          <div className="vd-panel-head">
            <div>
              <span>Verification Volume</span>
              <h2>{dashboard.summary ? `${dashboard.summary.totalRequests} requests` : 'Loading requests'}</h2>
            </div>
            <select value={filters.status} onChange={event => updateFilters({ status: event.target.value, page: 1 })} aria-label="Filter chart and table by status">
              {statusOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="vd-chart-kpis">
            <div><CalendarCheck2 size={15} /><span>Approval rate</span><strong>{dashboard.summary?.approvalRate || 0}%</strong></div>
            <div><ClipboardList size={15} /><span>Pending</span><strong>{dashboard.summary?.pendingCount || 0}</strong></div>
            <div><Flag size={15} /><span>Flagged</span><strong>{dashboard.summary?.flaggedCount || 0}</strong></div>
          </div>
          <VerificationChart points={dashboard.chart} loading={loading} />
        </article>

        <aside className="vd-panel vd-activity-panel">
          <div className="vd-panel-head compact">
            <div><span>Latest Updates</span><h2>Recent verifications</h2></div>
            <button type="button" onClick={retry}>Refresh</button>
          </div>
          <SearchInput
            id="activity-search"
            value={filters.activitySearch}
            onChange={value => updateFilters({ activitySearch: value })}
            placeholder="Search user, source, or event"
            label="Search latest updates"
          />
          <div className="vd-activity-list">
            {loading ? Array.from({ length: 4 }).map((_, index) => <div className="vd-activity-skeleton" key={index} />) : dashboard.activities.map(activity => (
              <ActivityItem activity={activity} onOpen={openRecord} key={activity.id} />
            ))}
            {!loading && dashboard.activities.length === 0 && <EmptyState title="No latest updates found." body="Try adjusting the latest updates search." />}
          </div>
        </aside>
      </section>

      <section className="vd-record-controls" aria-label="Verification record filters">
        <SearchInput
          id="records-search"
          value={filters.search}
          onChange={value => updateFilters({ search: value, page: 1 })}
          placeholder="Search by user, verification ID, session ID, source, or type"
          label="Search verification records"
        />
        <label>
          <span className="sr-only">Filter by status</span>
          <select value={filters.status} onChange={event => updateFilters({ status: event.target.value, page: 1 })}>
            {statusOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by verification type</span>
          <select value={filters.verificationType} onChange={event => updateFilters({ verificationType: event.target.value, page: 1 })}>
            <option value="">All types</option>
            {table.verificationTypes.map(type => <option value={type} key={type}>{type}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => updateFilters({ search: '', status: '', verificationType: '', page: 1 })}>Reset</button>
      </section>

      <VerificationTable
        records={table.records}
        loading={loading}
        page={table.page}
        totalPages={table.totalPages}
        total={table.total}
        sortBy={filters.sortBy}
        sortDirection={filters.sortDirection}
        onSort={changeSort}
        onPageChange={page => updateFilters({ page })}
        onOpen={openRecord}
        onAction={runAction}
        permissions={permissions}
      />

      <section className="vd-operational-note">
        <CheckCircle2 size={16} />
        <span>Cards, filters, table actions, details, and review transitions are backed by the dashboard service adapter and can be swapped to REST endpoints without rewriting this page.</span>
      </section>

      {selectedRecord && (
        <VerificationDetailsPanel
          record={selectedRecord}
          permissions={permissions}
          onClose={() => setSelectedRecord(null)}
          onAction={runAction}
        />
      )}
    </main>
  )
}
