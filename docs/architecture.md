# Architecture

## Frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Radix tabs/tooltips
- local deterministic planner logic in `apps/web/lib/planner.ts`
- local persistence helpers in `apps/web/lib/storage/scenarios.ts`
- uPlot wrapper in `apps/web/components/planner-chart.tsx`

The frontend owns:

- form state and validation UX
- deterministic calculations
- chart rendering
- scenario compare UI
- local storage save/load
- beginner-facing explanation copy

## Backend

- FastAPI
- Pydantic models
- deterministic mirror of the finance engine in `apps/api/app/domain/retirement.py`

The backend currently exposes calculation endpoints for:

- accumulation
- withdrawal
- journey

## Boundaries

- finance formulas stay out of presentation components
- the main planner does not depend on backend round trips
- storage for MVP is local browser storage only
- backend persistence and Monte Carlo are later phases, not core-path dependencies
