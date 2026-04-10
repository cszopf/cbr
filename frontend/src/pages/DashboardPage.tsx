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
    <div className={`rounded-lg border p-6 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function DashboardPage() {
  useEffect(() => { trackEvent('page_view', {}, '/') }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })

  if (isLoading) return <div className="text-gray-500">Loading dashboard...</div>
  if (!stats) return <div className="text-red-500">Failed to load stats</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Ohio real estate license overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Licenses" value={stats.total_licenses} color="blue" />
        <StatCard label="Active Licenses" value={stats.active_licenses} color="green" />
        <StatCard
          label="Expiring Within 90 Days"
          value={stats.expiring_within_90}
          color="yellow"
          to="/alerts"
        />
        <StatCard
          label="Expiring Within 30 Days"
          value={stats.expiring_within_30}
          color="red"
          to="/alerts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">License Types</h2>
          <div className="space-y-3">
            {Object.entries(stats.credential_type_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / stats.total_licenses) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Cities</h2>
          <div className="space-y-3">
            {stats.top_cities.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{city}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(count / stats.top_cities[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(stats.status_counts)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{status}</p>
                <p className="text-lg font-semibold text-gray-900">{count.toLocaleString()}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
