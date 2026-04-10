import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import supabase from '../api/client'

const ADMIN_HASH = '1904a1a3'

function hashSimple(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16)
}

async function fetchAnalytics(days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: events } = await supabase.get('/cbr_analytics', {
    params: {
      created_at: `gte.${since}`,
      select: 'event_type,session_id,page_path,event_data,ip_hash,created_at,user_agent',
      order: 'created_at.desc',
      limit: '5000',
    },
  })

  const rows = (events || []) as Array<Record<string, string | null>>

  const sessions = new Set<string>()
  const visitors = new Set<string>()
  const typeCounts: Record<string, number> = {}
  const daily: Record<string, { events: number; sessions: Set<string> }> = {}
  const searches: Record<string, number> = {}
  const licensePaths: Record<string, number> = {}
  const recentEvents: typeof rows = []
  const locationMap: Record<string, { lat: number; lon: number; city: string; region: string; count: number }> = {}

  for (const e of rows) {
    if (e.session_id) sessions.add(e.session_id)
    if (e.ip_hash) visitors.add(e.ip_hash)

    const t = e.event_type || 'unknown'
    typeCounts[t] = (typeCounts[t] || 0) + 1

    const day = (e.created_at || '').slice(0, 10)
    if (day) {
      if (!daily[day]) daily[day] = { events: 0, sessions: new Set() }
      daily[day].events++
      if (e.session_id) daily[day].sessions.add(e.session_id)
    }

    if (t === 'search' && e.event_data) {
      const q = String(e.event_data)
      searches[q] = (searches[q] || 0) + 1
    }

    if (t === 'license_view' && e.page_path) {
      licensePaths[e.page_path] = (licensePaths[e.page_path] || 0) + 1
    }

    // Extract geo data from event_data
    const ed = e.event_data as Record<string, unknown> | null
    if (ed && typeof ed === 'object' && ed.lat && ed.lon) {
      const key = `${ed.lat},${ed.lon}`
      if (!locationMap[key]) {
        locationMap[key] = { lat: Number(ed.lat), lon: Number(ed.lon), city: String(ed.city || ''), region: String(ed.region || ''), count: 0 }
      }
      locationMap[key].count++
    }

    if (recentEvents.length < 50) recentEvents.push(e)
  }

  const dailyArr = Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, events: d.events, sessions: d.sessions.size }))

  const topSearches = Object.entries(searches).sort(([, a], [, b]) => b - a).slice(0, 15)
  const topLicenses = Object.entries(licensePaths).sort(([, a], [, b]) => b - a).slice(0, 15)

  const locations = Object.values(locationMap).sort((a, b) => b.count - a.count)

  return {
    totalEvents: rows.length,
    uniqueSessions: sessions.size,
    uniqueVisitors: visitors.size,
    typeCounts,
    dailyArr,
    topSearches,
    topLicenses,
    recentEvents,
    locations,
  }
}

function AdminDashboard() {
  const [days, setDays] = useState(7)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => fetchAnalytics(days),
  })

  if (isLoading) return <div className="text-gray-500 text-center py-12">Loading analytics...</div>
  if (!data) return <div className="text-red-500 text-center py-12">Failed to load</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Analytics</h1>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600">Total Events</p>
          <p className="text-2xl font-bold text-blue-700">{data.totalEvents.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600">Sessions</p>
          <p className="text-2xl font-bold text-green-700">{data.uniqueSessions}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-xs text-purple-600">Unique Visitors</p>
          <p className="text-2xl font-bold text-purple-700">{data.uniqueVisitors}</p>
        </div>
      </div>

      {/* Visitor Map */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Visitor Locations</h2>
        {data.locations.length > 0 ? (
          <>
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '350px' }}>
              <MapContainer center={[39.96, -82.99]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {data.locations.map((loc, i) => (
                  <CircleMarker
                    key={i}
                    center={[loc.lat, loc.lon]}
                    radius={Math.min(8 + loc.count * 3, 30)}
                    fillColor="#3b82f6"
                    fillOpacity={0.6}
                    stroke={true}
                    color="#1d4ed8"
                    weight={1}
                  >
                    <Popup>
                      <strong>{loc.city}{loc.region ? `, ${loc.region}` : ''}</strong><br />
                      {loc.count} event{loc.count !== 1 ? 's' : ''}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-3 space-y-1">
              {data.locations.slice(0, 10).map((loc, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-700">{loc.city}{loc.region ? `, ${loc.region}` : ''}</span>
                  <span className="text-gray-500 font-medium">{loc.count} events</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No location data yet. Locations are captured on new visits going forward.</p>
        )}
      </div>

      {/* Event types */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Events by Type</h2>
        <div className="space-y-2">
          {Object.entries(data.typeCounts).sort(([, a], [, b]) => b - a).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{type}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / data.totalEvents) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-10 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily traffic */}
      {data.dailyArr.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Daily Traffic</h2>
          <div className="space-y-1.5">
            {data.dailyArr.map((d) => {
              const maxEvents = Math.max(...data.dailyArr.map(x => x.events))
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{d.date}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                    <div className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((d.events / maxEvents) * 100, 8)}%` }}>
                      <span className="text-[10px] text-white font-medium">{d.events}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{d.sessions}s</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top searches */}
      {data.topSearches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Top Searches</h2>
          <div className="space-y-1.5">
            {data.topSearches.map(([query, count], i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-sm text-gray-700 truncate mr-2">{query}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top license views */}
      {data.topLicenses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Most Viewed Licenses</h2>
          <div className="space-y-1.5">
            {data.topLicenses.map(([path, count], i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-sm text-gray-700 font-mono">{path}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {data.recentEvents.map((e, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 text-xs">
              <span className="text-gray-400 w-14 flex-shrink-0">{(e.created_at || '').slice(11, 19)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                e.event_type === 'page_view' ? 'bg-gray-100 text-gray-600'
                : e.event_type === 'search' ? 'bg-blue-100 text-blue-700'
                : e.event_type === 'license_view' ? 'bg-green-100 text-green-700'
                : e.event_type === 'renewal_click' ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600'
              }`}>{e.event_type}</span>
              <span className="text-gray-600 truncate">{e.page_path}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (hashSimple(password) === ADMIN_HASH) {
      setAuthed(true)
      setError(false)
      sessionStorage.setItem('cbr_admin', '1')
    } else {
      setError(true)
    }
  }

  // Check if already authed this session
  if (!authed && sessionStorage.getItem('cbr_admin') === '1') {
    setAuthed(true)
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm space-y-4">
          <h1 className="text-lg font-bold text-gray-900 text-center">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Enter password"
            className={`w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            autoFocus
          />
          {error && <p className="text-sm text-red-600 text-center">Wrong password</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800">
            Log In
          </button>
        </form>
      </div>
    )
  }

  return <AdminDashboard />
}
