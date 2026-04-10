from datetime import date

from app.schemas import CategoryProgress, CEProgress
from app.supabase_client import sb_get, sb_get_one, sb_post

CE_REQUIREMENTS = {
    "CORE_LAW": {"label": "Core Law", "hours": 3.0},
    "ETHICS": {"label": "Ohio Canons of Ethics", "hours": 3.0},
    "CIVIL_RIGHTS": {"label": "Civil Rights", "hours": 3.0},
    "ELECTIVE": {"label": "Elective", "hours": 21.0},
}

BROKER_EXTRA = {"BROKER_MGMT": {"label": "Broker Management", "hours": 3.0}}
TOTAL_REQUIRED = 30.0
BROKER_TYPES = {"BRK", "PBRK", "MBRK"}


def get_ce_records(license_id: int) -> list[dict]:
    return sb_get("ce_records", {
        "license_id": f"eq.{license_id}",
        "order": "completion_date.desc",
    })


def add_ce_record(license_id: int, data: dict) -> dict:
    record = {"license_id": license_id, **data}
    results = sb_post("ce_records", record)
    return results[0] if results else record


def compute_ce_progress(license_id: int) -> CEProgress | None:
    license_obj = sb_get_one("ohio_licenses", {"id": f"eq.{license_id}"})
    if not license_obj:
        return None

    ce_due_str = license_obj.get("ce_due_date")
    exp_str = license_obj.get("expiration_date")

    if ce_due_str:
        ce_due = date.fromisoformat(ce_due_str)
        period_end = ce_due
        period_start = date(ce_due.year - 3, ce_due.month, ce_due.day)
        days_until_due = (ce_due - date.today()).days
    elif exp_str:
        period_end = date.fromisoformat(exp_str)
        period_start = date(period_end.year - 3, period_end.month, period_end.day)
        days_until_due = None
        ce_due = None
    else:
        period_end = date.today()
        period_start = date(period_end.year - 3, period_end.month, period_end.day)
        days_until_due = None
        ce_due = None

    records = sb_get("ce_records", {
        "license_id": f"eq.{license_id}",
        "completion_date": f"gte.{period_start.isoformat()}",
        "and": f"(completion_date.lte.{period_end.isoformat()})",
    })

    hours_by_cat: dict[str, float] = {}
    for rec in records:
        cat = rec["category"]
        hours_by_cat[cat] = hours_by_cat.get(cat, 0.0) + rec["hours"]

    is_broker = license_obj.get("license_type") in BROKER_TYPES
    reqs = dict(CE_REQUIREMENTS)
    if is_broker:
        reqs["BROKER_MGMT"] = BROKER_EXTRA["BROKER_MGMT"]
        reqs["ELECTIVE"] = {"label": "Elective", "hours": 18.0}

    categories = []
    for cat, info in reqs.items():
        categories.append(
            CategoryProgress(
                category=cat,
                label=info["label"],
                hours_completed=hours_by_cat.get(cat, 0.0),
                hours_required=info["hours"],
                is_met=hours_by_cat.get(cat, 0.0) >= info["hours"],
            )
        )

    total_all = sum(hours_by_cat.values())
    pct = min((total_all / TOTAL_REQUIRED) * 100, 100.0) if TOTAL_REQUIRED > 0 else 0.0

    return CEProgress(
        license_id=license_id,
        total_hours=total_all,
        total_required=TOTAL_REQUIRED,
        percent_complete=round(pct, 1),
        categories=categories,
        ce_due_date=ce_due,
        days_until_due=days_until_due,
    )
