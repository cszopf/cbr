from datetime import date, timedelta

from app.schemas import ExpiringLicense
from app.supabase_client import sb_get, sb_get_one, sb_patch, sb_post


def get_expiring_licenses(days_before: int = 90) -> list[ExpiringLicense]:
    today = date.today()
    cutoff = (today + timedelta(days=days_before)).isoformat()
    today_str = today.isoformat()

    licenses = sb_get("ohio_licenses", {
        "status": "in.(ACTIVE,ACTIVE / PRINT LICENSE)",
        "expiration_date": f"gte.{today_str}",
        "and": f"(expiration_date.lte.{cutoff})",
        "order": "expiration_date.asc",
        "select": "id,license_number,first_name,last_name,credential_type,expiration_date,ce_due_date,status,employer_name",
        "limit": 500,
    })

    return [
        ExpiringLicense(
            id=lic["id"],
            license_number=lic["license_number"],
            first_name=lic["first_name"],
            last_name=lic["last_name"],
            credential_type=lic["credential_type"],
            expiration_date=lic.get("expiration_date"),
            ce_due_date=lic.get("ce_due_date"),
            days_remaining=(date.fromisoformat(lic["expiration_date"]) - today).days if lic.get("expiration_date") else None,
            status=lic["status"],
            employer_name=lic.get("employer_name"),
        )
        for lic in licenses
    ]


def get_alert_preference(license_id: int) -> dict | None:
    return sb_get_one("alert_preferences", {"license_id": f"eq.{license_id}"})


def upsert_alert_preference(license_id: int, data: dict) -> dict:
    existing = sb_get_one("alert_preferences", {"license_id": f"eq.{license_id}"})
    if existing:
        results = sb_patch("alert_preferences", {"license_id": f"eq.{license_id}"}, data)
        return results[0] if results else existing
    else:
        record = {"license_id": license_id, **data}
        results = sb_post("alert_preferences", record)
        return results[0] if results else record
