"""
Generate SQL INSERT statements from the Excel file for Supabase import.
Outputs batched SQL files that can be run against Supabase.

Usage: python -m app.seed_supabase [path_to_xlsx] [output_dir]
"""

import sys
from datetime import datetime
from pathlib import Path

import openpyxl

DEFAULT_XLSX = Path.home() / "Desktop" / "OLD" / "Real_Estate_and_Profession_Licensing 2.xlsx"

CREDENTIAL_TYPE_MAP = {
    "Real Estate Salesperson": "SAL",
    "Real Estate Principal Broker": "PBRK",
    "Real Estate Associate Broker": "BRKA",
    "Real Estate Broker": "BRK",
    "Real Estate Management Level Broker": "MBRK",
}


def escape_sql(val: str | None) -> str:
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def parse_date(val) -> str:
    if not val:
        return "NULL"
    s = str(val)
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            d = datetime.strptime(s, fmt).date()
            return f"'{d.isoformat()}'"
        except ValueError:
            continue
    return "NULL"


def generate_sql_batches(xlsx_path: str | Path, output_dir: str | Path, batch_size: int = 500):
    xlsx_path = Path(xlsx_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading {xlsx_path}...")
    wb = openpyxl.load_workbook(str(xlsx_path), read_only=True)
    ws = wb.worksheets[0]

    seen: set[str] = set()
    batch: list[str] = []
    file_num = 0
    count = 0

    cols = (
        "contact_id, license_number, license_type, credential_type, "
        "first_name, middle_name, last_name, suffix, company_name, status, "
        "address1, address2, city, state, zip_code, email, "
        "first_issuance_date, expiration_date, ce_due_date, license_issued_date, "
        "date_last_activity, employer_credential, employer_name, employer_address, "
        "employer_dba, employer_status"
    )

    for i, row in enumerate(ws.iter_rows(min_row=3, values_only=True)):
        credential = row[6]
        if not credential or not isinstance(credential, str):
            continue
        if credential in seen:
            continue
        seen.add(credential)

        credential_type = row[14] or ""
        license_type = CREDENTIAL_TYPE_MAP.get(credential_type, "SAL")

        values = (
            f"{escape_sql(str(row[0]) if row[0] is not None else None)}, "
            f"{escape_sql(credential)}, "
            f"{escape_sql(license_type)}, "
            f"{escape_sql(credential_type)}, "
            f"{escape_sql(str(row[1]) if row[1] else '')}, "
            f"{escape_sql(str(row[2]) if row[2] else None)}, "
            f"{escape_sql(str(row[3]) if row[3] else '')}, "
            f"{escape_sql(str(row[4]) if row[4] else None)}, "
            f"{escape_sql(str(row[5]) if row[5] else None)}, "
            f"{escape_sql(str(row[15]) if row[15] else 'UNKNOWN')}, "
            f"{escape_sql(str(row[7]) if row[7] else None)}, "
            f"{escape_sql(str(row[8]) if row[8] else None)}, "
            f"{escape_sql(str(row[9]) if row[9] else None)}, "
            f"{escape_sql(str(row[10]) if row[10] else None)}, "
            f"{escape_sql(str(row[11]) if row[11] else None)}, "
            f"{escape_sql(str(row[12]) if row[12] else None)}, "
            f"{parse_date(row[16])}, "
            f"{parse_date(row[17])}, "
            f"{parse_date(row[18])}, "
            f"{parse_date(row[19])}, "
            f"{escape_sql(str(row[13]) if row[13] else None)}, "
            f"{escape_sql(str(row[21]) if row[21] else None)}, "
            f"{escape_sql(str(row[22]) if row[22] else None)}, "
            f"{escape_sql(str(row[23]) if row[23] else None)}, "
            f"{escape_sql(str(row[24]) if row[24] else None)}, "
            f"{escape_sql(str(row[25]) if row[25] else None)}"
        )
        batch.append(f"({values})")
        count += 1

        if len(batch) >= batch_size:
            sql = f"INSERT INTO ohio_licenses ({cols}) VALUES\n" + ",\n".join(batch) + ";\n"
            outfile = output_dir / f"batch_{file_num:03d}.sql"
            outfile.write_text(sql)
            print(f"  Wrote {outfile.name} ({len(batch)} rows, total {count})")
            batch = []
            file_num += 1

    if batch:
        sql = f"INSERT INTO ohio_licenses ({cols}) VALUES\n" + ",\n".join(batch) + ";\n"
        outfile = output_dir / f"batch_{file_num:03d}.sql"
        outfile.write_text(sql)
        print(f"  Wrote {outfile.name} ({len(batch)} rows, total {count})")
        file_num += 1

    wb.close()
    print(f"\nDone! Generated {file_num} SQL files with {count} total records.")
    return file_num


if __name__ == "__main__":
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    output_dir = sys.argv[2] if len(sys.argv) > 2 else Path(__file__).parent.parent / "sql_batches"
    generate_sql_batches(xlsx_path, output_dir)
