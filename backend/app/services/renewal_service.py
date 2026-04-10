"""
Renewal readiness checklist for Ohio real estate licenses.
"""

from datetime import date

from app.schemas import RenewalChecklist, RenewalChecklistItem
from app.services.ce_service import compute_ce_progress
from app.supabase_client import sb_get_one

OHIO_ELICENSE_RENEWAL_URL = "https://elicense.lpi.ohio.gov"

RENEWAL_FEES = {
    "SAL": 81,
    "BRKA": 81,
    "BRK": 126,
    "PBRK": 126,
    "MBRK": 126,
}


def get_renewal_checklist(license_id: int) -> RenewalChecklist | None:
    license_obj = sb_get_one("ohio_licenses", {"id": f"eq.{license_id}"})
    if not license_obj:
        return None

    today = date.today()
    exp_str = license_obj.get("expiration_date")
    exp = date.fromisoformat(exp_str) if exp_str else None
    days_until = (exp - today).days if exp else None

    ce_progress = compute_ce_progress(license_id)

    checklist: list[RenewalChecklistItem] = []

    is_active = license_obj["status"] in ("ACTIVE", "ACTIVE / PRINT LICENSE")
    checklist.append(RenewalChecklistItem(
        item="Active License",
        description="Your license must be in ACTIVE status to renew online.",
        is_complete=is_active,
    ))

    in_renewal_window = days_until is not None and 0 < days_until <= 90
    expired = days_until is not None and days_until <= 0
    if expired:
        window_desc = "Your license has expired. Late renewal may require reactivation and additional fees."
    elif in_renewal_window:
        window_desc = f"Your renewal window is open. {days_until} days until expiration."
    else:
        window_desc = f"Renewal opens ~90 days before expiration ({days_until} days remaining)." if days_until else "Expiration date not available."

    checklist.append(RenewalChecklistItem(
        item="Renewal Window",
        description=window_desc,
        is_complete=in_renewal_window or expired,
    ))

    ce_complete = ce_progress is not None and ce_progress.percent_complete >= 100
    if ce_progress:
        ce_desc = (
            f"CE requirements met: {ce_progress.total_hours}/{ce_progress.total_required} hours completed."
            if ce_complete
            else f"CE incomplete: {ce_progress.total_hours}/{ce_progress.total_required} hours. "
                 f"Complete all required categories before renewing."
        )
    else:
        ce_desc = "Unable to determine CE status. Verify your CE hours on the eLicense portal."

    checklist.append(RenewalChecklistItem(
        item="Continuing Education (30 hours)",
        description=ce_desc,
        is_complete=ce_complete,
    ))

    if ce_progress:
        for cat in ce_progress.categories:
            if cat.category == "ELECTIVE":
                continue
            checklist.append(RenewalChecklistItem(
                item=f"CE: {cat.label} ({cat.hours_required:.0f} hrs)",
                description=f"{cat.hours_completed:.1f} of {cat.hours_required:.0f} hours completed.",
                is_complete=cat.is_met,
            ))

    fee = RENEWAL_FEES.get(license_obj.get("license_type", "SAL"), 81)
    checklist.append(RenewalChecklistItem(
        item=f"Renewal Fee (~${fee})",
        description=f"Pay via the Ohio eLicense LPI portal. Fee is approximately ${fee}.",
        is_complete=False,
        action_url=OHIO_ELICENSE_RENEWAL_URL,
    ))

    checklist.append(RenewalChecklistItem(
        item="OHID Account",
        description="You need an OHID account to access the eLicense portal. If you haven't claimed your license in the new system, do so first.",
        is_complete=False,
        action_url="https://ohid.ohio.gov",
    ))

    is_eligible = is_active and (in_renewal_window or expired)
    name = f"{license_obj['first_name']} {license_obj['last_name']}"
    ce_due_str = license_obj.get("ce_due_date")

    return RenewalChecklist(
        license_id=license_id,
        license_number=license_obj["license_number"],
        name=name,
        credential_type=license_obj["credential_type"],
        expiration_date=exp,
        ce_due_date=date.fromisoformat(ce_due_str) if ce_due_str else None,
        days_until_expiration=days_until,
        is_eligible_for_renewal=is_eligible,
        checklist=checklist,
        renewal_url=OHIO_ELICENSE_RENEWAL_URL,
        ce_progress=ce_progress,
    )
