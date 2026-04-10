import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import alerts, analytics, ce, licenses, renewal

app = FastAPI(
    title="CBR - Columbus Board of Realtors",
    description="Ohio real estate license lookup, CE tracking, and expiration alerts",
    version="0.1.0",
)

# Allow frontend origins
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.vercel.app",
]
# Add production URL if set
prod_url = os.getenv("FRONTEND_URL")
if prod_url:
    allowed_origins.append(prod_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(licenses.router, prefix="/api")
app.include_router(ce.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(renewal.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve built frontend in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
