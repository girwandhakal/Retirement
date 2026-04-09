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
- The web workspace is configured for `npm` workspaces.
- The API workspace is configured for `uv`.

## Expected local workflow

### Web

1. Run `npm install`.
2. Run `npm run dev:web`.
3. Open `http://localhost:3000`.

If PowerShell blocks `npm.ps1` on your machine, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev:web
```

### API

1. Install `uv` or use a Python virtual environment directly.
2. From `apps/api`, run `uv sync --extra dev` once `uv` is available.
3. From the repo root, run `python -m uvicorn app.main:app --reload --app-dir apps/api`.
