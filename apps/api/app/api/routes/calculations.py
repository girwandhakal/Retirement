from fastapi import APIRouter

from app.domain.retirement import (
    calculate_accumulation,
    calculate_journey,
    calculate_withdrawal,
)
from app.schemas.planner import (
    AccumulationResult,
    JourneyResult,
    PlannerInput,
    WithdrawalResult,
)

router = APIRouter()


@router.post("/accumulation", response_model=AccumulationResult)
def accumulation(payload: PlannerInput) -> AccumulationResult:
    return calculate_accumulation(payload)


@router.post("/withdrawal", response_model=WithdrawalResult)
def withdrawal(payload: PlannerInput) -> WithdrawalResult:
    return calculate_withdrawal(payload)


@router.post("/journey", response_model=JourneyResult)
def journey(payload: PlannerInput) -> JourneyResult:
    return calculate_journey(payload)

