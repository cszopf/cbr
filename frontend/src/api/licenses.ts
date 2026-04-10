import type { DashboardStats, License, LicenseSearchResponse, LicenseSearchResult } from '../types'
import supabase from './client'

export async function searchLicenses(params: {
  q?: string
  license_type?: string
  status?: string
  city?: string
  page?: number
  page_size?: number
}): Promise<LicenseSearchResponse> {
  const page = params.page || 1
  const pageSize = params.page_size || 25
  const offset = (page - 1) * pageSize

  const queryParams: Record<string, string> = {
    select: 'id,license_number,license_type,credential_type,first_name,last_name,status,city,expiration_date,employer_name',
    order: 'last_name.asc,first_name.asc',
    offset: String(offset),
    limit: String(pageSize),
  }

  if (params.q) {
    const q = params.q
    queryParams.or = `(first_name.ilike.%${q}%,last_name.ilike.%${q}%,license_number.ilike.%${q}%,employer_name.ilike.%${q}%,company_name.ilike.%${q}%)`
  }
  if (params.license_type) queryParams.license_type = `eq.${params.license_type}`
  if (params.status) queryParams.status = `eq.${params.status}`
  if (params.city) queryParams.city = `ilike.%${params.city}%`

  const { data, headers } = await supabase.get('/ohio_licenses', {
    params: queryParams,
    headers: { Prefer: 'count=exact' },
  })

  const contentRange = headers['content-range'] || ''
  const total = contentRange.includes('/') ? parseInt(contentRange.split('/')[1]) : (data as LicenseSearchResult[]).length

  return {
    results: data as LicenseSearchResult[],
    total,
    page,
    page_size: pageSize,
  }
}

export async function getLicense(id: number): Promise<License> {
  const { data } = await supabase.get('/ohio_licenses', {
    params: { id: `eq.${id}`, limit: '1' },
  })
  return (data as License[])[0]
}

export async function getStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0]
  const d30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const d90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]

  const countHeader = { Prefer: 'count=exact' }

  const [totalRes, activeRes, exp90Res, exp30Res] = await Promise.all([
    supabase.head('/ohio_licenses', { headers: countHeader }),
    supabase.head('/ohio_licenses', { params: { status: 'eq.ACTIVE' }, headers: countHeader }),
    supabase.head('/ohio_licenses', { params: { status: 'eq.ACTIVE', expiration_date: `lte.${d90}`, and: `(expiration_date.gte.${today})` }, headers: countHeader }),
    supabase.head('/ohio_licenses', { params: { status: 'eq.ACTIVE', expiration_date: `lte.${d30}`, and: `(expiration_date.gte.${today})` }, headers: countHeader }),
  ])

  const parseCount = (r: { headers: Record<string, unknown> }) => {
    const cr = String(r.headers?.['content-range'] || '')
    return cr.includes('/') ? parseInt(cr.split('/')[1]) : 0
  }

  // Get counts for credential types and statuses in parallel
  const credTypes = ['Real Estate Salesperson', 'Real Estate Principal Broker', 'Real Estate Associate Broker', 'Real Estate Broker', 'Real Estate Management Level Broker']
  const statusList = ['ACTIVE', 'INACTIVE', 'INACTIVE / NON-RENEWED', 'PENDING', 'DECEASED']
  const cityList = ['Columbus', 'Cincinnati', 'Cleveland', 'Dayton', 'Toledo', 'Dublin', 'Westerville', 'Akron', 'Canton', 'Powell']

  const [credRes, statusRes, cityRes] = await Promise.all([
    Promise.all(credTypes.map(ct => supabase.head('/ohio_licenses', { params: { credential_type: `eq.${ct}` }, headers: countHeader }).catch(() => ({ headers: {} })))),
    Promise.all(statusList.map(s => supabase.head('/ohio_licenses', { params: { status: `eq.${s}` }, headers: countHeader }).catch(() => ({ headers: {} })))),
    Promise.all(cityList.map(c => supabase.head('/ohio_licenses', { params: { city: `eq.${c}` }, headers: countHeader }).catch(() => ({ headers: {} })))),
  ])

  const credential_type_counts: Record<string, number> = {}
  credTypes.forEach((ct, i) => { credential_type_counts[ct] = parseCount(credRes[i] as { headers: Record<string, unknown> }) })

  const status_counts: Record<string, number> = {}
  statusList.forEach((s, i) => {
    const c = parseCount(statusRes[i] as { headers: Record<string, unknown> })
    if (c > 0) status_counts[s] = c
  })

  const top_cities: [string, number][] = []
  cityList.forEach((city, i) => {
    const c = parseCount(cityRes[i] as { headers: Record<string, unknown> })
    if (c > 0) top_cities.push([city, c])
  })

  return {
    total_licenses: parseCount(totalRes),
    active_licenses: parseCount(activeRes),
    expiring_within_90: parseCount(exp90Res),
    expiring_within_30: parseCount(exp30Res),
    credential_type_counts,
    status_counts,
    top_cities,
  }
}
