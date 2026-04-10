"""
Load SQL batch files into Supabase via the MCP execute_sql tool.
This script outputs the SQL for each batch to be run manually or via API.

For use with the Claude MCP Supabase tool - just reads and prints batch content.
"""

import sys
from pathlib import Path


def get_batches(batch_dir: str | Path = None):
    if batch_dir is None:
        batch_dir = Path(__file__).parent.parent / "sql_batches"
    batch_dir = Path(batch_dir)
    files = sorted(batch_dir.glob("batch_*.sql"))
    print(f"Found {len(files)} batch files")
    for f in files:
        print(f"  {f.name}: {f.stat().st_size:,} bytes")
    return files


if __name__ == "__main__":
    get_batches()
