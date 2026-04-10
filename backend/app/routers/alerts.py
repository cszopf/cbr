from fastapi import APIRouter, Query

from app.schemas import AlertPreferenceCreate, ExpiringLicense
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/", response_model=list[ExpiringLicense])
def get_expiring(days_before: int = Query(90, ge=1, le=365)):
    return alert_service.get_expiring_licenses(days_before)


@router.get("/preferences/{license_id}")
def get_preference(license_id: int):
    return alert_service.get_alert_preference(license_id)


@router.post("/preferences/{license_id}")
def set_preference(license_id: int, data: AlertPreferenceCreate):
    return alert_service.upsert_alert_preference(license_id, data.model_dump())
