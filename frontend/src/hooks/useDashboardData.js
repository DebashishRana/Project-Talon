import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardService } from '../services/dashboardService'
import { useDebouncedValue } from './useDebouncedValue'

export function useDashboardData(filters) {
  const debouncedSearch = useDebouncedValue(filters.search, 260)
  const debouncedActivitySearch = useDebouncedValue(filters.activitySearch, 260)
  const [dashboard, setDashboard] = useState({ summary: null, chart: [], activities: [] })
  const [table, setTable] = useState({ records: [], total: 0, page: 1, limit: 10, totalPages: 1, verificationTypes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
    activitySearch: debouncedActivitySearch
  }), [filters, debouncedSearch, debouncedActivitySearch])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboardData, tableData] = await Promise.all([
        dashboardService.getDashboard(query),
        dashboardService.getVerifications(query)
      ])
      setDashboard(dashboardData)
      setTable(tableData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void load()
  }, [load])

  return { dashboard, table, loading, error, retry: load }
}
