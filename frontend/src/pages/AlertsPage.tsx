import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../api/analytics'
import { getExpiringLicenses } from '../api/alerts'

function urgencyColor(days: number | null) {
  if (days === null) return 'bg-gray-50'
  if (days <= 30) return 'bg-red-50 border-red-200'
  if (days <= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-yellow-50 border-yellow-200'
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expiration Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Active licenses expiring soon</p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 flex-shrink-0">Expiring within</label>
        <select
          value={daysBefore}
          onChange={(e) => setDaysBefore(parseInt(e.target.value))}
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white"
        >
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      {isLoading && <div className="text-gray-500 text-center py-8">Loading alerts...</div>}

      {data && (
        <>
          <p className="text-xs text-gray-500">{data.length.toLocaleString()} licenses</p>

          <div className="space-y-2">
            {data.map((lic) => (
              <Link
                key={lic.id}
                to={`/license/${lic.id}`}
                className={`block rounded-xl border p-3.5 active:opacity-80 transition-opacity ${urgencyColor(lic.days_remaining)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{lic.last_name}, {lic.first_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{lic.license_number} · {lic.credential_type}</p>
                    {lic.employer_name && <p className="text-xs text-gray-400 mt-0.5 truncate">{lic.employer_name}</p>}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyBadge(lic.days_remaining)}`}>
                      {lic.days_remaining !== null ? `${lic.days_remaining}d` : '—'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1">{lic.expiration_date}</span>
                  </div>
                </div>
              </Link>
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
