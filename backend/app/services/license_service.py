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

    filters = []
    if q:
        # PostgREST 'or' filter: search across multiple columns
        pattern = f"%{q}%"
        filters.append(
            f"or=(first_name.ilike.{pattern},last_name.ilike.{pattern},"
            f"license_number.ilike.{pattern},employer_name.ilike.{pattern},"
            f"company_name.ilike.{pattern})"
        )
    if license_type:
        params["license_type"] = f"eq.{license_type}"
    if status:
        params["status"] = f"eq.{status}"
    if city:
        params["city"] = f"ilike.%{city}%"

    # Build the query string manually for 'or' filters
    if filters:
        # Use the or filter syntax
        params["or"] = (
            f"(first_name.ilike.%{q}%,last_name.ilike.%{q}%,"
            f"license_number.ilike.%{q}%,employer_name.ilike.%{q}%,"
            f"company_name.ilike.%{q}%)"
        )

    # Get count
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
    # PostgREST 'in' filter
    nums_str = ",".join(license_numbers)
    found = sb_get("ohio_licenses", {"license_number": f"in.({nums_str})"})
    found_numbers = {r["license_number"] for r in found}
    not_found = [n for n in license_numbers if n not in found_numbers]
    return found, not_found


def get_dashboard_stats() -> dict:
    from datetime import date, timedelta

    today = date.today()
    d30 = (today + timedelta(days=30)).isoformat()
    d90 = (today + timedelta(days=90)).isoformat()
    today_str = today.isoformat()

    total = sb_head("ohio_licenses")
    active = sb_head("ohio_licenses", {"status": "eq.ACTIVE"})

    exp_90 = sb_head("ohio_licenses", {
        "status": "eq.ACTIVE",
        "expiration_date": f"lte.{d90}",
        "and": f"(expiration_date.gte.{today_str})",
    })
    exp_30 = sb_head("ohio_licenses", {
        "status": "eq.ACTIVE",
        "expiration_date": f"lte.{d30}",
        "and": f"(expiration_date.gte.{today_str})",
    })

    # For credential type and status counts, use RPC or aggregate queries
    # PostgREST doesn't support GROUP BY directly, so we'll use a simpler approach
    # Fetch known types with counts
    cred_types = {}
    for ct in ["Real Estate Salesperson", "Real Estate Principal Broker", "Real Estate Associate Broker", "Real Estate Broker", "Real Estate Management Level Broker"]:
        cred_types[ct] = sb_head("ohio_licenses", {"credential_type": f"eq.{ct}"})

    status_list = ["ACTIVE", "INACTIVE", "INACTIVE / NON-RENEWED", "PENDING", "DECEASED", "DENIED",
                   "ACTIVE / PRINT LICENSE", "INACTIVE / EXEMPT", "INACTIVE / MILITARY", "PENDING CHECKLIST"]
    status_counts = {}
    for s in status_list:
        c = sb_head("ohio_licenses", {"status": f"eq.{s}"})
        if c > 0:
            status_counts[s] = c

    top_cities_list = ["Columbus", "Cincinnati", "Cleveland", "Dayton", "Toledo", "Dublin", "Westerville", "Akron", "Canton", "Powell"]
    top_cities = []
    for city in top_cities_list:
        c = sb_head("ohio_licenses", {"city": f"eq.{city}"})
        if c > 0:
            top_cities.append((city, c))

    return {
        "total_licenses": total,
        "active_licenses": active,
        "expiring_within_90": exp_90,
        "expiring_within_30": exp_30,
        "credential_type_counts": cred_types,
        "status_counts": status_counts,
        "top_cities": top_cities,
    }
