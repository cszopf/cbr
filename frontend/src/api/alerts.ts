import type { ExpiringLicense } from '../types'
import supabase from './client'

export async function getExpiringLicenses(daysBefore: number = 90): Promise<ExpiringLicense[]> {
  const today = new Date().toISOString().split('T')[0]
  const cutoff = new Date(Date.now() + daysBefore * 86400000).toISOString().split('T')[0]

  const { data } = await supabase.get('/ohio_licenses', {
    params: {
      select: 'id,license_number,first_name,last_name,credential_type,expiration_date,ce_due_date,status,employer_name',
      status: 'in.(ACTIVE,ACTIVE / PRINT LICENSE)',
      expiration_date: `gte.${today}`,
      and: `(expiration_date.lte.${cutoff})`,
      order: 'expiration_date.asc',
      limit: '500',
    },
  })

  return (data as Array<Record<string, string | null>>).map((lic) => ({
    id: Number(lic.id),
    license_number: lic.license_number!,
    first_name: lic.first_name!,
    last_name: lic.last_name!,
    credential_type: lic.credential_type!,
    expiration_date: lic.expiration_date,
    ce_due_date: lic.ce_due_date,
    days_remaining: lic.expiration_date ? Math.floor((new Date(lic.expiration_date).getTime() - Date.now()) / 86400000) : null,
    status: lic.status!,
    employer_name: lic.employer_name,
  }))
}
