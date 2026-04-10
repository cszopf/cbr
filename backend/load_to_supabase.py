#!/usr/bin/env python3
"""Load SQL batch files into Supabase using the Management API."""
import os
import sys
import json
import urllib.request
import urllib.error

# Supabase Management API
SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_ID = "vcaisuhqogmlyrhgzzzc"
SQL_DIR = "/Users/chrissauerzopf/cbr/backend/sql_batches"

def execute_sql(query, project_id=PROJECT_ID):
    """Execute SQL via Supabase Management API."""
    url = f"https://api.supabase.com/v1/projects/{project_id}/database/query"
    headers = {
        "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else str(e)
        return None, f"HTTP {e.code}: {body}"
    except Exception as e:
        return None, str(e)

def main():
    if not SUPABASE_ACCESS_TOKEN:
        print("ERROR: SUPABASE_ACCESS_TOKEN env var not set")
        sys.exit(1)

    succeeded = 0
    failed = 0
    errors = []

    for i in range(117):
        fname = f"batch_{i:03d}.sql"
        fpath = os.path.join(SQL_DIR, fname)

        if not os.path.exists(fpath):
            print(f"SKIP {fname}: file not found")
            failed += 1
            errors.append((fname, "file not found"))
            continue

        with open(fpath, "r") as f:
            sql = f.read().strip()

        print(f"Executing {fname} ({len(sql)} bytes)...", end=" ", flush=True)
        result, error = execute_sql(sql)

        if error:
            print(f"FAILED: {error[:200]}")
            failed += 1
            errors.append((fname, error[:200]))
        else:
            print("OK")
            succeeded += 1

    # Verify count
    print("\n--- Verifying row count ---")
    result, error = execute_sql("SELECT count(*) FROM ohio_licenses;")
    if error:
        print(f"Count query failed: {error}")
    else:
        print(f"Count result: {result}")

    print(f"\n--- Summary ---")
    print(f"Succeeded: {succeeded}")
    print(f"Failed: {failed}")
    if errors:
        print("Errors:")
        for fname, err in errors:
            print(f"  {fname}: {err}")

if __name__ == "__main__":
    main()
