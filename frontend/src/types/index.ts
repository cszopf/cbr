export interface LicenseSearchResult {
  id: number
  license_number: string
  license_type: string
  credential_type: string
  first_name: string
  last_name: string
  status: string
  city: string | null
  expiration_date: string | null
  employer_name: string | null
}

export interface LicenseSearchResponse {
  results: LicenseSearchResult[]
  total: number
  page: number
  page_size: number
}

export interface License {
  id: number
  license_number: string
  license_type: string
  credential_type: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  company_name: string | null
  status: string
  address1: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  email: string | null
  first_issuance_date: string | null
  expiration_date: string | null
  ce_due_date: string | null
  license_issued_date: string | null
  employer_credential: string | null
  employer_name: string | null
  employer_dba: string | null
  employer_status: string | null
  last_synced: string | null
  created_at: string
  updated_at: string
}

export interface CERecord {
  id: number
  license_id: number
  course_name: string
  provider: string | null
  category: string
  hours: number
  completion_date: string
  reporting_period_start: string
  reporting_period_end: string
  created_at: string
}

export interface CategoryProgress {
  category: string
  label: string
  hours_completed: number
  hours_required: number
  is_met: boolean
}

export interface CEProgress {
  license_id: number
  total_hours: number
  total_required: number
  percent_complete: number
  categories: CategoryProgress[]
  ce_due_date: string | null
  days_until_due: number | null
}

export interface ExpiringLicense {
  id: number
  license_number: string
  first_name: string
  last_name: string
  credential_type: string
  expiration_date: string | null
  ce_due_date: string | null
  days_remaining: number | null
  status: string
  employer_name: string | null
}

export interface DashboardStats {
  total_licenses: number
  active_licenses: number
  expiring_within_90: number
  expiring_within_30: number
  credential_type_counts: Record<string, number>
  status_counts: Record<string, number>
  top_cities: [string, number][]
}
