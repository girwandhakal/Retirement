# Retirement Planner

A no-login, browser-local retirement planning tool. Full product direction is documented in `.agent/project-plan.md`.

## What it does today

- Deterministic accumulation calculator (portfolio growth before retirement)
- Deterministic withdrawal simulator (drawdown during retirement)
- Combined full-journey mode connecting both phases
- Retirement goal solving for required monthly contribution
- Real-time chart and summary card updates as inputs change
- Mobile-responsive layout with touch-optimized interactions
- FastAPI endpoints mirroring the browser-side calculator contract

## What it does not do yet

- Scenario presets, save/load, or import/export
- Scenario comparison
- Monte Carlo simulation
- Tax-aware estimates
- Social Security or pension income
- User authentication

## Structure

```text
apps/
  api/   FastAPI app for calculation endpoints
  web/   Next.js App Router app for the planner UI
fixtures/
  retirement-scenarios.json   shared scenario data
packages/
  config/   shared TypeScript config
docs/
  product-spec.md
  math-spec.md
  architecture.md
  milestones.md
  assumptions.md
.agent/
  AGENTS.md
  project-plan.md
  implementation-plan.md
  research.md
```

## Product notes

- No login is required.
- Core planner interactions run locally in the browser.
- Results are estimates, not financial advice.
- The current model is deterministic and does not include taxes, Social Security, or Monte Carlo simulation.

## Local development

### Web

```powershell
npm install
npm run dev:web
```

Open `http://localhost:3000`.

If PowerShell blocks `npm.ps1`, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev:web
```

### API

1. Install [uv](https://docs.astral.sh/uv/) or create a Python virtual environment.
2. From `apps/api`, run `uv sync --extra dev`.
3. From the repo root, run `python -m uvicorn app.main:app --reload --app-dir apps/api`.

## Verification

### Web

```powershell
npm run test:web
npm run build:web
```

### API

```powershell
python -m pytest apps/api/tests
python -m compileall apps/api
```
