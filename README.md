# Retirement Planner

Initial scaffold for the retirement planning product described in `.agent/project-plan.md` and `.agent/research.md`.

## Structure

```text
apps/
  api/   FastAPI app for calculation and scenario APIs
  web/   Next.js App Router app for the calculator experience
fixtures/
  retirement-scenarios.json
packages/
  config/ shared TypeScript config
.agent/
  project-plan.md
  research.md
.agents/
  implementation-plan.md
```

## Current status

- The repo scaffold is in place.
- Dependencies have not been installed yet.
- The machine currently has `node` and `python`, but `pnpm` and `uv` were not available when the scaffold was created.

## Expected local workflow

### Web

1. Install `pnpm`.
2. Run `pnpm install`.
3. Run `pnpm dev:web`.

### API

1. Install `uv` or use a Python virtual environment directly.
2. From `apps/api`, run `uv sync --extra dev` once `uv` is available.
3. From the repo root, run `python -m uvicorn app.main:app --reload --app-dir apps/api`.
