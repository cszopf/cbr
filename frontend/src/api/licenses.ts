import type { DashboardStats, License, LicenseSearchResponse } from '../types'
import api from './client'

export async function searchLicenses(params: {
  q?: string
  license_type?: string
  status?: string
  city?: string
  page?: number
  page_size?: number
}): Promise<LicenseSearchResponse> {
  const { data } = await api.get('/licenses/search', { params })
  return data
}

export async function getLicense(id: number): Promise<License> {
  const { data } = await api.get(`/licenses/${id}`)
  return data
}

export async function getStats(): Promise<DashboardStats> {
  const { data } = await api.get('/licenses/stats')
  return data
}

export async function bulkLookup(licenseNumbers: string[]) {
  const { data } = await api.post('/licenses/bulk', { license_numbers: licenseNumbers })
  return data
}
