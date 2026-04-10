from datetime import date, datetime

from pydantic import BaseModel


# --- License ---

class LicenseCreate(BaseModel):
    license_number: str
    license_type: str
    credential_type: str
    first_name: str
    middle_name: str | None = None
    last_name: str
    suffix: str | None = None
    company_name: str | None = None
    status: str = "ACTIVE"
    address1: str | None = None
    address2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    email: str | None = None
    first_issuance_date: date | None = None
    expiration_date: date | None = None
    ce_due_date: date | None = None
    license_issued_date: date | None = None
    employer_credential: str | None = None
    employer_name: str | None = None
    employer_address: str | None = None
    employer_dba: str | None = None
    employer_status: str | None = None


class LicenseResponse(BaseModel):
    id: int
    license_number: str
    license_type: str
    credential_type: str
    first_name: str
    middle_name: str | None
    last_name: str
    suffix: str | None
    company_name: str | None
    status: str
    address1: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    email: str | None
    first_issuance_date: date | None
    expiration_date: date | None
    ce_due_date: date | None
    license_issued_date: date | None
    employer_credential: str | None
    employer_name: str | None
    employer_dba: str | None
    employer_status: str | None
    last_synced: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LicenseSearchResult(BaseModel):
    id: int
    license_number: str
    license_type: str
    credential_type: str
    first_name: str
    last_name: str
    status: str
    city: str | None
    expiration_date: date | None
    employer_name: str | None

    model_config = {"from_attributes": True}


class LicenseSearchResponse(BaseModel):
    results: list[LicenseSearchResult]
    total: int
    page: int
    page_size: int


# --- CE Records ---

class CERecordCreate(BaseModel):
    course_name: str
    provider: str | None = None
    category: str
    hours: float
    completion_date: date
    reporting_period_start: date
    reporting_period_end: date


class CERecordResponse(BaseModel):
    id: int
    license_id: int
    course_name: str
    provider: str | None
    category: str
    hours: float
    completion_date: date
    reporting_period_start: date
    reporting_period_end: date
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryProgress(BaseModel):
    category: str
    label: str
    hours_completed: float
    hours_required: float
    is_met: bool


class CEProgress(BaseModel):
    license_id: int
    total_hours: float
    total_required: float
    percent_complete: float
    categories: list[CategoryProgress]
    ce_due_date: date | None
    days_until_due: int | None


# --- Alerts ---

class AlertPreferenceCreate(BaseModel):
    alert_days_before: int = 90
    email: str | None = None
    is_active: bool = True


class AlertPreferenceResponse(BaseModel):
    id: int
    license_id: int
    alert_days_before: int
    email: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class ExpiringLicense(BaseModel):
    id: int
    license_number: str
    first_name: str
    last_name: str
    credential_type: str
    expiration_date: date | None
    ce_due_date: date | None
    days_remaining: int | None
    status: str
    employer_name: str | None


# --- Bulk ---

class BulkLookupRequest(BaseModel):
    license_numbers: list[str]


class BulkLookupResponse(BaseModel):
    found: list[LicenseResponse]
    not_found: list[str]


# --- Stats ---

class DashboardStats(BaseModel):
    total_licenses: int
    active_licenses: int
    expiring_within_90: int
    expiring_within_30: int
    credential_type_counts: dict[str, int]
    status_counts: dict[str, int]
    top_cities: list[tuple[str, int]]


# --- Renewal ---

class RenewalChecklistItem(BaseModel):
    item: str
    description: str
    is_complete: bool
    action_url: str | None = None


class RenewalChecklist(BaseModel):
    license_id: int
    license_number: str
    name: str
    credential_type: str
    expiration_date: date | None
    ce_due_date: date | None
    days_until_expiration: int | None
    is_eligible_for_renewal: bool
    checklist: list[RenewalChecklistItem]
    renewal_url: str
    ce_progress: CEProgress | None = None
