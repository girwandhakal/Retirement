from fastapi import FastAPI

from app.api.router import router

app = FastAPI(
    title="Retirement Planner API",
    description=(
        "Typed calculation API for the retirement planner. "
        "The current version focuses on deterministic planning endpoints."
    ),
)

app.include_router(router)
