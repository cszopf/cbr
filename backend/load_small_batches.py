#!/usr/bin/env python3
"""Load small SQL batch files into Supabase using the Management API.
Processes batch_001.sql through batch_1169.sql from sql_batches_small/
"""
import os
import sys
import json
import time
import urllib.request
import urllib.error
import concurrent.futures

# Supabase Management API
SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_ID = "vcaisuhqogmlyrhgzzzc"
SQL_DIR = "/Users/chrissauerzopf/cbr/backend/sql_batches_small"

START_BATCH = 1
END_BATCH = 1169
MAX_WORKERS = 5  # parallel requests
RETRY_COUNT = 2
RETRY_DELAY = 2  # seconds

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

def process_batch(batch_num):
    """Process a single batch file with retries."""
    fname = f"batch_{batch_num:03d}.sql" if batch_num < 1000 else f"batch_{batch_num}.sql"
    fpath = os.path.join(SQL_DIR, fname)

    if not os.path.exists(fpath):
        return batch_num, False, f"file not found: {fname}"

    with open(fpath, "r") as f:
        sql = f.read().strip()

    for attempt in range(RETRY_COUNT + 1):
        result, error = execute_sql(sql)
        if not error:
            return batch_num, True, None
        if attempt < RETRY_COUNT:
            time.sleep(RETRY_DELAY * (attempt + 1))

    return batch_num, False, error[:300] if error else "unknown error"

def main():
    if not SUPABASE_ACCESS_TOKEN:
        print("ERROR: SUPABASE_ACCESS_TOKEN env var not set")
        sys.exit(1)

    succeeded = 0
    failed = 0
    errors = []

    total = END_BATCH - START_BATCH + 1
    print(f"Processing {total} batch files ({START_BATCH} to {END_BATCH})...")
    print(f"Using {MAX_WORKERS} parallel workers")

    batch_nums = list(range(START_BATCH, END_BATCH + 1))

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_batch, n): n for n in batch_nums}

        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            batch_num, success, error = future.result()
            if success:
                succeeded += 1
            else:
                failed += 1
                errors.append((batch_num, error))

            # Progress every 100 batches
            done = succeeded + failed
            if done % 100 == 0 or done == total:
                print(f"Progress: {done}/{total} (success={succeeded}, fail={failed})")

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
        errors.sort(key=lambda x: x[0])
        print(f"Errors ({len(errors)}):")
        for batch_num, err in errors[:50]:  # show first 50
            print(f"  batch_{batch_num}: {err[:200]}")
        if len(errors) > 50:
            print(f"  ... and {len(errors) - 50} more errors")

if __name__ == "__main__":
    main()
