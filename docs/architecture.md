# Architecture

## Frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Radix tabs/tooltips
- local deterministic planner logic in `apps/web/lib/planner.ts`
- uPlot wrapper in `apps/web/components/planner-chart.tsx`

The frontend owns:

- form state and validation UX
- deterministic calculations
- chart rendering
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
- the current planner session is stateless in the browser
- backend persistence and Monte Carlo are later phases, not core-path dependencies
