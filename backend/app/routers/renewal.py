from fastapi import APIRouter, HTTPException

from app.schemas import RenewalChecklist
from app.services.renewal_service import get_renewal_checklist

router = APIRouter(prefix="/licenses/{license_id}/renewal", tags=["renewal"])


@router.get("/", response_model=RenewalChecklist)
def get_renewal_readiness(license_id: int):
    checklist = get_renewal_checklist(license_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="License not found")
    return checklist
