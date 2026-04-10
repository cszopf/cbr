from fastapi import APIRouter, Query

from app.schemas import (
    BulkLookupRequest,
    BulkLookupResponse,
    DashboardStats,
    LicenseSearchResponse,
    LicenseSearchResult,
)
from app.services import license_service

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("/search", response_model=LicenseSearchResponse)
def search_licenses(
    q: str | None = Query(None),
    license_type: str | None = Query(None),
    status: str | None = Query(None),
    city: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    results, total = license_service.search_licenses(q, license_type, status, city, page, page_size)
    return LicenseSearchResponse(
        results=[LicenseSearchResult(**r) for r in results],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=DashboardStats)
def get_stats():
    return license_service.get_dashboard_stats()


@router.get("/{license_id}")
def get_license(license_id: int):
    from fastapi import HTTPException
    lic = license_service.get_license(license_id)
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")
    return lic


@router.post("/bulk", response_model=BulkLookupResponse)
def bulk_lookup(data: BulkLookupRequest):
    found, not_found = license_service.bulk_lookup(data.license_numbers)
    return BulkLookupResponse(found=found, not_found=not_found)
