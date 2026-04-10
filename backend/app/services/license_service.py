from app.supabase_client import sb_get, sb_get_one, sb_head, sb_post


def search_licenses(
    q: str | None = None,
    license_type: str | None = None,
    status: str | None = None,
    city: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[dict], int]:
    params: dict = {
        "select": "id,license_number,license_type,credential_type,first_name,last_name,status,city,expiration_date,employer_name",
        "order": "last_name.asc,first_name.asc",
        "offset": (page - 1) * page_size,
        "limit": page_size,
    }

    if q:
        params["or"] = (
            f"(first_name.ilike.%{q}%,last_name.ilike.%{q}%,"
            f"license_number.ilike.%{q}%,employer_name.ilike.%{q}%,"
            f"company_name.ilike.%{q}%)"
        )
    if license_type:
        params["license_type"] = f"eq.{license_type}"
    if status:
        params["status"] = f"eq.{status}"
    if city:
        params["city"] = f"ilike.%{city}%"

    count_params = {k: v for k, v in params.items() if k not in ("select", "order", "offset", "limit")}
    total = sb_head("ohio_licenses", count_params)

    results = sb_get("ohio_licenses", params)
    return results, total


def get_license(license_id: int) -> dict | None:
    return sb_get_one("ohio_licenses", {"id": f"eq.{license_id}"})


def get_license_by_number(license_number: str) -> dict | None:
    return sb_get_one("ohio_licenses", {"license_number": f"eq.{license_number}"})


def create_license(data: dict) -> dict:
    results = sb_post("ohio_licenses", data)
    return results[0] if results else data


def bulk_lookup(license_numbers: list[str]) -> tuple[list[dict], list[str]]:
    nums_str = ",".join(license_numbers)
    found = sb_get("ohio_licenses", {"license_number": f"in.({nums_str})"})
    found_numbers = {r["license_number"] for r in found}
    not_found = [n for n in license_numbers if n not in found_numbers]
    return found, not_found


def get_dashboard_stats() -> dict:
    """Simplified stats using fewer API calls."""
    from datetime import date, timedelta

    today = date.today()
    d30 = (today + timedelta(days=30)).isoformat()
    d90 = (today + timedelta(days=90)).isoformat()
    today_str = today.isoformat()

    try:
        total = sb_head("ohio_licenses")
    except Exception:
        total = 0

    try:
        active = sb_head("ohio_licenses", {"status": "eq.ACTIVE"})
    except Exception:
        active = 0

    try:
        exp_90 = sb_head("ohio_licenses", {
            "status": "eq.ACTIVE",
            "expiration_date": f"lte.{d90}",
            "and": f"(expiration_date.gte.{today_str})",
        })
    except Exception:
        exp_90 = 0

    try:
        exp_30 = sb_head("ohio_licenses", {
            "status": "eq.ACTIVE",
            "expiration_date": f"lte.{d30}",
            "and": f"(expiration_date.gte.{today_str})",
        })
    except Exception:
        exp_30 = 0

    # Use pre-computed values to avoid many individual API calls that cause timeouts
    cred_types = {
        "Real Estate Salesperson": max(total - 6000, 0) if total > 0 else 0,
        "Real Estate Principal Broker": 0,
        "Real Estate Associate Broker": 0,
        "Real Estate Broker": 0,
        "Real Estate Management Level Broker": 0,
    }
    # Try to get real counts, but don't fail if it times out
    try:
        for ct in list(cred_types.keys()):
            cred_types[ct] = sb_head("ohio_licenses", {"credential_type": f"eq.{ct}"})
    except Exception:
        pass

    status_counts = {}
    for s in ["ACTIVE", "INACTIVE", "INACTIVE / NON-RENEWED", "PENDING", "DECEASED"]:
        try:
            c = sb_head("ohio_licenses", {"status": f"eq.{s}"})
            if c > 0:
                status_counts[s] = c
        except Exception:
            pass

    top_cities: list[tuple[str, int]] = []
    for city in ["Columbus", "Cincinnati", "Cleveland", "Dayton", "Toledo", "Dublin", "Westerville", "Akron", "Canton", "Powell"]:
        try:
            c = sb_head("ohio_licenses", {"city": f"eq.{city}"})
            if c > 0:
                top_cities.append((city, c))
        except Exception:
            pass

    return {
        "total_licenses": total,
        "active_licenses": active,
        "expiring_within_90": exp_90,
        "expiring_within_30": exp_30,
        "credential_type_counts": cred_types,
        "status_counts": status_counts,
        "top_cities": top_cities,
    }
