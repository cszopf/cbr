import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { trackEvent } from '../api/analytics'
import { searchLicenses } from '../api/licenses'
import type { LicenseSearchResult } from '../types'

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'INACTIVE / NON-RENEWED', 'PENDING', 'DECEASED', 'DENIED']
const TYPE_OPTIONS = [
  { value: 'SAL', label: 'Salesperson' },
  { value: 'BRKA', label: 'Assoc. Broker' },
  { value: 'BRK', label: 'Broker' },
  { value: 'PBRK', label: 'Principal Broker' },
  { value: 'MBRK', label: 'Mgmt Broker' },
]

function statusColor(status: string) {
  if (status === 'ACTIVE' || status === 'ACTIVE / PRINT LICENSE') return 'bg-green-100 text-green-800'
  if (status.startsWith('INACTIVE')) return 'bg-gray-100 text-gray-800'
  if (status === 'PENDING' || status === 'PENDING CHECKLIST') return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-700'
}

export default function LookupPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '')
  const [suggestions, setSuggestions] = useState<LicenseSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => { trackEvent('page_view', {}, '/lookup') }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(value: string) {
    setInputValue(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const timer = setTimeout(async () => {
      try {
        const res = await searchLicenses({ q: value, status: 'ACTIVE', page: 1, page_size: 15 })
        setSuggestions(res.results)
        setShowSuggestions(true)
      } catch { setSuggestions([]) }
    }, 250)
    setDebounceTimer(timer)
  }

  function selectSuggestion(lic: LicenseSearchResult) {
    setShowSuggestions(false)
    navigate(`/license/${lic.id}`)
  }

  const q = searchParams.get('q') || ''
  const licenseType = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const city = searchParams.get('city') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const { data, isLoading } = useQuery({
    queryKey: ['licenses', q, licenseType, status || 'ACTIVE', city, page],
    queryFn: () => searchLicenses({
      q: q || undefined, license_type: licenseType || undefined,
      status: status || 'ACTIVE', city: city || undefined, page, page_size: 25,
    }),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setShowSuggestions(false)
    const params: Record<string, string> = {}
    if (inputValue) params.q = inputValue
    if (licenseType) params.type = licenseType
    if (status) params.status = status
    if (city) params.city = city
    params.page = '1'
    setSearchParams(params)
    trackEvent('search', { query: inputValue, type: licenseType, status, city })
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value); else params.delete(key)
    params.set('page', '1')
    setSearchParams(params)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    setSearchParams(params)
  }

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">License Lookup</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="space-y-2">
        <div ref={wrapperRef} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
            placeholder="Name, license #, or employer..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[60vh] overflow-y-auto">
              {suggestions.map((lic) => (
                <button
                  key={lic.id} type="button" onClick={() => selectSuggestion(lic)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{lic.last_name}, {lic.first_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColor(lic.status)}`}>{lic.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    <span className="font-mono">{lic.license_number}</span>
                    {lic.city ? ` · ${lic.city}` : ''}{lic.employer_name ? ` · ${lic.employer_name}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors">
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:bg-gray-300"
          >
            Filters {showFilters ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </form>

      {/* Collapsible filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white rounded-xl border border-gray-200 p-3">
          <select value={licenseType} onChange={(e) => updateFilter('type', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white w-full">
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={status} onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white w-full">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="text" value={city} onChange={(e) => updateFilter('city', e.target.value)}
            placeholder="City..." className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm w-full" />
        </div>
      )}

      {isLoading && <div className="text-gray-500 text-center py-8">Searching...</div>}

      {data && (
        <>
          <p className="text-xs text-gray-500">
            {data.total.toLocaleString()} results{totalPages > 1 && ` · Page ${page}/${totalPages}`}
          </p>

          {/* Mobile: card list. Desktop: table */}
          <div className="md:hidden space-y-2">
            {data.results.map((lic) => (
              <Link key={lic.id} to={`/license/${lic.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-3.5 active:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lic.last_name}, {lic.first_name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{lic.license_number}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${statusColor(lic.status)}`}>
                    {lic.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{lic.credential_type}</span>
                  <span>{lic.city || ''}</span>
                </div>
                {lic.employer_name && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{lic.employer_name}</p>
                )}
                {lic.expiration_date && (
                  <p className="text-xs text-gray-400 mt-0.5">Exp: {lic.expiration_date}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.results.map((lic) => (
                  <tr key={lic.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/license/${lic.id}`} className="text-blue-600 hover:underline font-medium">{lic.last_name}, {lic.first_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{lic.license_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lic.credential_type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(lic.status)}`}>{lic.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lic.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lic.expiration_date || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{lic.employer_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1}
                className="px-4 py-2.5 text-sm rounded-xl border border-gray-300 disabled:opacity-40 hover:bg-gray-50 active:bg-gray-100">
                Prev
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}
                className="px-4 py-2.5 text-sm rounded-xl border border-gray-300 disabled:opacity-40 hover:bg-gray-50 active:bg-gray-100">
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!data && !isLoading && (
        <div className="text-center py-12 text-gray-400">No results found</div>
      )}
    </div>
  )
}
