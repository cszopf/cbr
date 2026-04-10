"""
Vercel serverless function entry point.
Wraps the FastAPI app for Vercel's Python runtime.
"""

import sys
from pathlib import Path

# Add backend to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.main import app  # noqa: E402, F401
