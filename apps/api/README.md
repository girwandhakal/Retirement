# Retirement API

FastAPI scaffold for deterministic retirement planning endpoints.

## Planned surface

- `GET /health`
- `POST /v1/calc/accumulation`
- `POST /v1/calc/withdrawal`
- `POST /v1/calc/journey`

## Notes

- SQLAlchemy, Alembic, PostgreSQL, and NumPy are included in the project dependencies.
- Persistence is intentionally not wired yet because the first milestone is calculator correctness and a stable API contract.

