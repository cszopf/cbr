from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'cbr.db'}"

SCRAPER_ENABLED = False
SCRAPER_RATE_LIMIT_SECONDS = 2.0
