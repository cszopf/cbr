import supabase from './client'
import { getCEProgress } from './ce'

export interface RenewalChecklistItem {
  item: string
  description: string
  is_complete: boolean
  action_url: string | null
}

export interface RenewalChecklist {
  license_id: number
  license_number: string
  name: string
  credential_type: string
  expiration_date: string | null
  ce_due_date: string | null
  days_until_expiration: number | null
  is_eligible_for_renewal: boolean
  checklist: RenewalChecklistItem[]
  renewal_url: string
}

const RENEWAL_FEES: Record<string, number> = { SAL: 81, BRKA: 81, BRK: 126, PBRK: 126, MBRK: 126 }
const PORTAL_URL = 'https://elicense.lpi.ohio.gov'

export async function getRenewalChecklist(licenseId: number): Promise<RenewalChecklist> {
  const { data } = await supabase.get('/ohio_licenses', {
    params: { id: `eq.${licenseId}`, limit: '1' },
  })
  const lic = (data as Array<Record<string, string | null>>)[0]

  const exp = lic.expiration_date ? new Date(lic.expiration_date) : null
  const daysUntil = exp ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null

  const ceProgress = await getCEProgress(licenseId)

  const checklist: RenewalChecklistItem[] = []

  const isActive = lic.status === 'ACTIVE' || lic.status === 'ACTIVE / PRINT LICENSE'
  checklist.push({ item: 'Active License', description: isActive ? 'License is active.' : 'License must be ACTIVE to renew online.', is_complete: isActive, action_url: null })

  const inWindow = daysUntil !== null && daysUntil > 0 && daysUntil <= 90
  const expired = daysUntil !== null && daysUntil <= 0
  checklist.push({
    item: 'Renewal Window',
    description: expired ? 'License expired. Late renewal may require reactivation.' : inWindow ? `Renewal window open. ${daysUntil} days remaining.` : `Renewal opens ~90 days before expiration (${daysUntil ?? '?'} days).`,
    is_complete: inWindow || expired,
    action_url: null,
  })

  const ceComplete = ceProgress.percent_complete >= 100
  checklist.push({
    item: 'Continuing Education (30 hours)',
    description: ceComplete ? `CE met: ${ceProgress.total_hours}/${ceProgress.total_required} hrs.` : `CE incomplete: ${ceProgress.total_hours}/${ceProgress.total_required} hrs.`,
    is_complete: ceComplete,
    action_url: null,
  })

  for (const cat of ceProgress.categories) {
    if (cat.category === 'ELECTIVE') continue
    checklist.push({ item: `CE: ${cat.label} (${cat.hours_required} hrs)`, description: `${cat.hours_completed} of ${cat.hours_required} hours.`, is_complete: cat.is_met, action_url: null })
  }

  const fee = RENEWAL_FEES[lic.license_type || 'SAL'] || 81
  checklist.push({ item: `Renewal Fee (~$${fee})`, description: `Pay via Ohio eLicense LPI portal.`, is_complete: false, action_url: PORTAL_URL })
  checklist.push({ item: 'OHID Account', description: 'You need an OHID account for the eLicense portal.', is_complete: false, action_url: 'https://ohid.ohio.gov' })

  return {
    license_id: licenseId,
    license_number: lic.license_number!,
    name: `${lic.first_name} ${lic.last_name}`,
    credential_type: lic.credential_type!,
    expiration_date: lic.expiration_date,
    ce_due_date: lic.ce_due_date,
    days_until_expiration: daysUntil,
    is_eligible_for_renewal: isActive && (inWindow || expired),
    checklist,
    renewal_url: PORTAL_URL,
  }
}
