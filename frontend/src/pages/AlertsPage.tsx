import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../api/analytics'
import { getExpiringLicenses } from '../api/alerts'

function urgencyColor(days: number | null) {
  if (days === null) return 'bg-gray-50'
  if (days <= 30) return 'bg-red-50'
  if (days <= 60) return 'bg-amber-50'
  return 'bg-yellow-50'
}

function urgencyBadge(days: number | null) {
  if (days === null) return 'bg-gray-100 text-gray-700'
  if (days <= 30) return 'bg-red-100 text-red-800'
  if (days <= 60) return 'bg-amber-100 text-amber-800'
  return 'bg-yellow-100 text-yellow-800'
}

export default function AlertsPage() {
  const [daysBefore, setDaysBefore] = useState(90)

  useEffect(() => { trackEvent('page_view', {}, '/alerts') }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', daysBefore],
    queryFn: () => getExpiringLicenses(daysBefore),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expiration Alerts</h1>
          <p className="text-gray-500 mt-1">Active licenses expiring soon</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Show expiring within</label>
          <select
            value={daysBefore}
            onChange={(e) => setDaysBefore(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="text-gray-500">Loading alerts...</div>}

      {data && (
        <>
          <div className="text-sm text-gray-500">
            {data.length.toLocaleString()} licenses expiring within {daysBefore} days
          </div>

          <div className="space-y-2">
            {data.map((lic) => (
              <div
                key={lic.id}
                className={`rounded-lg border border-gray-200 p-4 flex items-center justify-between ${urgencyColor(lic.days_remaining)}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${urgencyBadge(lic.days_remaining)}`}>
                    {lic.days_remaining !== null ? `${lic.days_remaining}d` : '—'}
                  </span>
                  <div>
                    <Link to={`/license/${lic.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {lic.last_name}, {lic.first_name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {lic.license_number} · {lic.credential_type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">Expires: {lic.expiration_date}</p>
                  {lic.employer_name && (
                    <p className="text-xs text-gray-500">{lic.employer_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No licenses expiring within {daysBefore} days
            </div>
          )}
        </>
      )}
    </div>
  )
}
