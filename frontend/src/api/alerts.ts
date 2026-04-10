import type { ExpiringLicense } from '../types'
import api from './client'

export async function getExpiringLicenses(daysBefore: number = 90): Promise<ExpiringLicense[]> {
  const { data } = await api.get('/alerts', { params: { days_before: daysBefore } })
  return data
}
