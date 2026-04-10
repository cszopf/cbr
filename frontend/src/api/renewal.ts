import api from './client'

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

export async function getRenewalChecklist(licenseId: number): Promise<RenewalChecklist> {
  const { data } = await api.get(`/licenses/${licenseId}/renewal/`)
  return data
}
