from fastapi import APIRouter

from app.api.routes.calculations import router as calculations_router
from app.api.routes.health import router as health_router

router = APIRouter()
router.include_router(health_router)
router.include_router(calculations_router, prefix="/v1/calc", tags=["calculations"])

