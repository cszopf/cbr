import type { CategoryProgress, CEProgress, CERecord } from '../types'
import supabase from './client'

const CE_REQUIREMENTS: Record<string, { label: string; hours: number }> = {
  CORE_LAW: { label: 'Core Law', hours: 3 },
  ETHICS: { label: 'Ohio Canons of Ethics', hours: 3 },
  CIVIL_RIGHTS: { label: 'Civil Rights', hours: 3 },
  ELECTIVE: { label: 'Elective', hours: 21 },
}

const BROKER_TYPES = new Set(['BRK', 'PBRK', 'MBRK'])

export async function getCERecords(licenseId: number): Promise<CERecord[]> {
  const { data } = await supabase.get('/ce_records', {
    params: { license_id: `eq.${licenseId}`, order: 'completion_date.desc' },
  })
  return data as CERecord[]
}

export async function getCEProgress(licenseId: number): Promise<CEProgress> {
  // Get license info
  const { data: licData } = await supabase.get('/ohio_licenses', {
    params: { id: `eq.${licenseId}`, select: 'id,license_type,ce_due_date,expiration_date', limit: '1' },
  })
  const license = (licData as Array<Record<string, string>>)[0]

  const ceDueStr = license?.ce_due_date
  const expStr = license?.expiration_date

  let periodEnd: string
  let periodStart: string
  let daysUntilDue: number | null = null

  if (ceDueStr) {
    periodEnd = ceDueStr
    const d = new Date(ceDueStr)
    periodStart = new Date(d.getFullYear() - 3, d.getMonth(), d.getDate()).toISOString().split('T')[0]
    daysUntilDue = Math.floor((d.getTime() - Date.now()) / 86400000)
  } else if (expStr) {
    periodEnd = expStr
    const d = new Date(expStr)
    periodStart = new Date(d.getFullYear() - 3, d.getMonth(), d.getDate()).toISOString().split('T')[0]
  } else {
    periodEnd = new Date().toISOString().split('T')[0]
    const d = new Date()
    periodStart = new Date(d.getFullYear() - 3, d.getMonth(), d.getDate()).toISOString().split('T')[0]
  }

  // Get CE records in period
  const { data: records } = await supabase.get('/ce_records', {
    params: {
      license_id: `eq.${licenseId}`,
      completion_date: `gte.${periodStart}`,
      and: `(completion_date.lte.${periodEnd})`,
    },
  })

  const hoursByCat: Record<string, number> = {}
  for (const rec of records as CERecord[]) {
    hoursByCat[rec.category] = (hoursByCat[rec.category] || 0) + rec.hours
  }

  const isBroker = BROKER_TYPES.has(license?.license_type || '')
  const reqs = { ...CE_REQUIREMENTS }
  if (isBroker) {
    reqs.BROKER_MGMT = { label: 'Broker Management', hours: 3 }
    reqs.ELECTIVE = { label: 'Elective', hours: 18 }
  }

  const categories: CategoryProgress[] = Object.entries(reqs).map(([cat, info]) => ({
    category: cat,
    label: info.label,
    hours_completed: hoursByCat[cat] || 0,
    hours_required: info.hours,
    is_met: (hoursByCat[cat] || 0) >= info.hours,
  }))

  const totalHours = Object.values(hoursByCat).reduce((a, b) => a + b, 0)
  const totalRequired = 30

  return {
    license_id: licenseId,
    total_hours: totalHours,
    total_required: totalRequired,
    percent_complete: Math.min(Math.round((totalHours / totalRequired) * 1000) / 10, 100),
    categories,
    ce_due_date: ceDueStr || null,
    days_until_due: daysUntilDue,
  }
}
