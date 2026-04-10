import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../api/analytics'
import { getStats } from '../api/licenses'

function StatCard({ label, value, color = 'blue', to }: { label: string; value: number | string; color?: string; to?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  const card = (
    <div className={`rounded-xl border p-4 sm:p-6 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs sm:text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function DashboardPage() {
  useEffect(() => { trackEvent('page_view', {}, '/') }, [])

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  if (isLoading) return <div className="text-gray-500 text-center py-12">Loading dashboard...</div>
  if (error || !stats) return <div className="text-red-500 text-center py-12">Failed to load. <button onClick={() => window.location.reload()} className="underline">Retry</button></div>

  const credCounts: Record<string, number> = stats.credential_type_counts || {}
  const statusCounts: Record<string, number> = stats.status_counts || {}
  const topCities: [string, number][] = Array.isArray(stats.top_cities) ? stats.top_cities : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ohio real estate license overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Licenses" value={stats.total_licenses} color="blue" />
        <StatCard label="Active" value={stats.active_licenses} color="green" />
        <StatCard label="Exp. in 90 Days" value={stats.expiring_within_90} color="yellow" to="/alerts" />
        <StatCard label="Exp. in 30 Days" value={stats.expiring_within_30} color="red" to="/alerts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">License Types</h2>
          <div className="space-y-2.5">
            {Object.entries(credCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 truncate mr-2">{type}</span>
                    <span className="font-medium text-gray-900 flex-shrink-0">{count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(count / (stats.total_licenses || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Top Cities</h2>
          <div className="space-y-2.5">
            {topCities.map(([city, count]) => (
              <div key={city}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{city}</span>
                  <span className="font-medium text-gray-900">{count.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(count / (topCities[0]?.[1] || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(statusCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([st, count]) => (
              <div key={st} className="text-center p-2.5 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{st}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">{count.toLocaleString()}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
