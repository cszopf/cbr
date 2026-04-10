from fastapi import APIRouter, HTTPException

from app.schemas import CEProgress, CERecordCreate, CERecordResponse
from app.services import ce_service

router = APIRouter(prefix="/licenses/{license_id}/ce", tags=["continuing education"])


@router.get("/", response_model=list[CERecordResponse])
def get_ce_records(license_id: int):
    return ce_service.get_ce_records(license_id)


@router.get("/progress", response_model=CEProgress)
def get_ce_progress(license_id: int):
    progress = ce_service.compute_ce_progress(license_id)
    if not progress:
        raise HTTPException(status_code=404, detail="License not found")
    return progress


@router.post("/", response_model=CERecordResponse, status_code=201)
def add_ce_record(license_id: int, data: CERecordCreate):
    return ce_service.add_ce_record(license_id, data.model_dump())
