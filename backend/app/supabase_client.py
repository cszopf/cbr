"""
Supabase REST API client for the CBR backend.
Uses PostgREST endpoints with the anon key.
"""

import os

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://vcaisuhqogmlyrhgzzzc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWlzdWhxb2dtbHlyaGd6enpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODg0ODQsImV4cCI6MjA4ODc2NDQ4NH0.uWFXxc0nbQdCZf-YREBbXPaexzLRJB9o3JbcWvt2qg0")

_client: httpx.Client | None = None


def get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(
            base_url=f"{SUPABASE_URL}/rest/v1",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
    return _client


def sb_get(table: str, params: dict | None = None) -> list[dict]:
    """GET from a Supabase table with query params."""
    resp = get_client().get(f"/{table}", params=params or {})
    resp.raise_for_status()
    return resp.json()


def sb_get_one(table: str, params: dict | None = None) -> dict | None:
    """GET a single row from Supabase."""
    p = dict(params or {})
    p["limit"] = 1
    results = sb_get(table, p)
    return results[0] if results else None


def sb_post(table: str, data: dict | list) -> list[dict]:
    """POST (insert) to a Supabase table."""
    resp = get_client().post(
        f"/{table}",
        json=data,
        headers={"Prefer": "return=representation"},
    )
    resp.raise_for_status()
    return resp.json()


def sb_patch(table: str, params: dict, data: dict) -> list[dict]:
    """PATCH (update) rows matching params."""
    resp = get_client().patch(
        f"/{table}",
        params=params,
        json=data,
        headers={"Prefer": "return=representation"},
    )
    resp.raise_for_status()
    return resp.json()


def sb_head(table: str, params: dict | None = None) -> int:
    """HEAD request to get count."""
    resp = get_client().head(
        f"/{table}",
        params={**(params or {}), "select": "*"},
        headers={"Prefer": "count=exact"},
    )
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")
    # Format: "0-24/58260"
    if "/" in content_range:
        return int(content_range.split("/")[1])
    return 0


def sb_rpc(function_name: str, params: dict | None = None) -> dict:
    """Call a Supabase RPC function."""
    resp = get_client().post(
        f"/rpc/{function_name}",
        json=params or {},
    )
    resp.raise_for_status()
    return resp.json()
