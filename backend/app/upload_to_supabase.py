"""
Upload license data to Supabase via the PostgREST API.
RLS must be disabled on ohio_licenses before running this.

Usage: python -m app.upload_to_supabase
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import httpx
import openpyxl

DEFAULT_XLSX = Path.home() / "Desktop" / "OLD" / "Real_Estate_and_Profession_Licensing 2.xlsx"

SUPABASE_URL = "https://vcaisuhqogmlyrhgzzzc.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWlzdWhxb2dtbHlyaGd6enpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODg0ODQsImV4cCI6MjA4ODc2NDQ4NH0.uWFXxc0nbQdCZf-YREBbXPaexzLRJB9o3JbcWvt2qg0"

CREDENTIAL_TYPE_MAP = {
    "Real Estate Salesperson": "SAL",
    "Real Estate Principal Broker": "PBRK",
    "Real Estate Associate Broker": "BRKA",
    "Real Estate Broker": "BRK",
    "Real Estate Management Level Broker": "MBRK",
}


def parse_date(val) -> str | None:
    if not val:
        return None
    s = str(val)
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def clean_str(val) -> str | None:
    if val is None:
        return None
    s = str(val)
    # Clean up openpyxl formula objects
    if s.startswith("<openpyxl"):
        return None
    return s


def upload():
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    print(f"Loading {xlsx_path}...")
    wb = openpyxl.load_workbook(str(xlsx_path), read_only=True)
    ws = wb.worksheets[0]

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates",
    }

    seen: set[str] = set()
    batch: list[dict] = []
    count = 0
    errors = 0
    batch_size = 200

    with httpx.Client(timeout=30) as client:
        for i, row in enumerate(ws.iter_rows(min_row=3, values_only=True)):
            credential = row[6]
            if not credential or not isinstance(credential, str):
                continue
            if credential in seen:
                continue
            seen.add(credential)

            credential_type = str(row[14]) if row[14] else ""
            license_type = CREDENTIAL_TYPE_MAP.get(credential_type, "SAL")

            record = {
                "contact_id": clean_str(row[0]),
                "license_number": credential,
                "license_type": license_type,
                "credential_type": credential_type,
                "first_name": str(row[1] or ""),
                "middle_name": clean_str(row[2]),
                "last_name": str(row[3] or ""),
                "suffix": clean_str(row[4]),
                "company_name": clean_str(row[5]),
                "status": str(row[15] or "UNKNOWN"),
                "address1": clean_str(row[7]),
                "address2": clean_str(row[8]),
                "city": clean_str(row[9]),
                "state": clean_str(row[10]),
                "zip_code": clean_str(row[11]),
                "email": clean_str(row[12]),
                "first_issuance_date": parse_date(row[16]),
                "expiration_date": parse_date(row[17]),
                "ce_due_date": parse_date(row[18]),
                "license_issued_date": parse_date(row[19]),
                "date_last_activity": clean_str(row[13]),
                "employer_credential": clean_str(row[21]),
                "employer_name": clean_str(row[22]),
                "employer_address": clean_str(row[23]),
                "employer_dba": clean_str(row[24]),
                "employer_status": clean_str(row[25]),
            }
            batch.append(record)
            count += 1

            if len(batch) >= batch_size:
                resp = client.post(
                    f"{SUPABASE_URL}/rest/v1/ohio_licenses",
                    headers=headers,
                    json=batch,
                )
                if resp.status_code not in (200, 201):
                    print(f"  ERROR at {count}: {resp.status_code} - {resp.text[:200]}")
                    errors += 1
                batch = []
                if count % 2000 == 0:
                    print(f"  Uploaded {count} records...")

        if batch:
            resp = client.post(
                f"{SUPABASE_URL}/rest/v1/ohio_licenses",
                headers=headers,
                json=batch,
            )
            if resp.status_code not in (200, 201):
                print(f"  ERROR at final batch: {resp.status_code} - {resp.text[:200]}")
                errors += 1

    wb.close()
    print(f"\nDone! Uploaded {count} records ({errors} batch errors).")


if __name__ == "__main__":
    upload()
