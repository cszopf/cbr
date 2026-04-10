"""
Seed the database from the Ohio Real Estate licensing Excel export.
Usage: python -m app.seed_data [path_to_xlsx]
"""

import sys
from datetime import datetime
from pathlib import Path

import openpyxl
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import License

DEFAULT_XLSX = Path.home() / "Desktop" / "OLD" / "Real_Estate_and_Profession_Licensing 2.xlsx"

# Map credential types to short codes
CREDENTIAL_TYPE_MAP = {
    "Real Estate Salesperson": "SAL",
    "Real Estate Principal Broker": "PBRK",
    "Real Estate Associate Broker": "BRKA",
    "Real Estate Broker": "BRK",
    "Real Estate Management Level Broker": "MBRK",
}


def parse_date(val: str | None) -> datetime | None:
    if not val or not isinstance(val, str):
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


def seed_from_xlsx(xlsx_path: str | Path, batch_size: int = 1000):
    xlsx_path = Path(xlsx_path)
    if not xlsx_path.exists():
        print(f"File not found: {xlsx_path}")
        sys.exit(1)

    print(f"Loading {xlsx_path}...")
    wb = openpyxl.load_workbook(str(xlsx_path), read_only=True)
    ws = wb.worksheets[0]

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Check if already seeded
    existing = db.query(License).count()
    if existing > 0:
        print(f"Database already has {existing} licenses. Skipping seed.")
        db.close()
        wb.close()
        return

    print("Seeding database...")
    batch = []
    count = 0
    skipped = 0
    seen_credentials: set[str] = set()

    for i, row in enumerate(ws.iter_rows(min_row=3, values_only=True)):
        # Skip rows without a credential number
        credential = row[6]
        if not credential or not isinstance(credential, str):
            skipped += 1
            continue

        credential_type = row[14] or ""
        license_type = CREDENTIAL_TYPE_MAP.get(credential_type, "SAL")

        contact_id = str(row[0]) if row[0] is not None else None

        license_obj = License(
            contact_id=contact_id,
            license_number=credential,
            license_type=license_type,
            credential_type=credential_type,
            first_name=str(row[1] or ""),
            middle_name=str(row[2]) if row[2] else None,
            last_name=str(row[3] or ""),
            suffix=str(row[4]) if row[4] else None,
            company_name=str(row[5]) if row[5] else None,
            status=str(row[15] or "UNKNOWN"),
            address1=str(row[7]) if row[7] else None,
            address2=str(row[8]) if row[8] else None,
            city=str(row[9]) if row[9] else None,
            state=str(row[10]) if row[10] else None,
            zip_code=str(row[11]) if row[11] else None,
            email=str(row[12]) if row[12] else None,
            date_last_activity=str(row[13]) if row[13] else None,
            first_issuance_date=parse_date(str(row[16])) if row[16] else None,
            expiration_date=parse_date(str(row[17])) if row[17] else None,
            ce_due_date=parse_date(str(row[18])) if row[18] else None,
            license_issued_date=parse_date(str(row[19])) if row[19] else None,
            employer_credential=str(row[21]) if row[21] else None,
            employer_name=str(row[22]) if row[22] else None,
            employer_address=str(row[23]) if row[23] else None,
            employer_dba=str(row[24]) if row[24] else None,
            employer_status=str(row[25]) if row[25] else None,
            last_synced=datetime.now(),
        )
        if credential in seen_credentials:
            skipped += 1
            continue
        seen_credentials.add(credential)

        batch.append(license_obj)
        count += 1

        if len(batch) >= batch_size:
            db.add_all(batch)
            db.commit()
            batch = []
            print(f"  Imported {count} records...")

    if batch:
        db.add_all(batch)
        db.commit()

    db.close()
    wb.close()
    print(f"Done! Imported {count} licenses ({skipped} rows skipped).")


if __name__ == "__main__":
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    seed_from_xlsx(xlsx_path)
