import type { CEProgress, CERecord } from '../types'
import api from './client'

export async function getCERecords(licenseId: number): Promise<CERecord[]> {
  const { data } = await api.get(`/licenses/${licenseId}/ce/`)
  return data
}

export async function getCEProgress(licenseId: number): Promise<CEProgress> {
  const { data } = await api.get(`/licenses/${licenseId}/ce/progress`)
  return data
}

export async function addCERecord(licenseId: number, record: Omit<CERecord, 'id' | 'license_id' | 'created_at'>) {
  const { data } = await api.post(`/licenses/${licenseId}/ce/`, record)
  return data
}
