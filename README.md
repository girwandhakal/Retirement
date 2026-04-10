# Retirement Planner

Deterministic retirement planner described in `.agent/project-plan.md` and `.agent/research.md`.

The current app includes:

- browser-local accumulation, withdrawal, and full-journey planning
- retirement goal solving for required monthly contribution
- presets, local scenario save/load, JSON import/export, and scenario compare
- FastAPI endpoints that mirror the deterministic calculator contract
- shared fixture data for cross-layer regression coverage

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

## Product notes

- No login is required.
- Core planner interactions stay local in the browser.
- Results are estimates, not financial advice.
- The current model is deterministic and does not yet include taxes, Social Security, or Monte Carlo simulation.

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

To reduce disk churn on Windows, keep the repo out of OneDrive if possible. Next.js writes heavily to `apps/web/.next`, and OneDrive plus antivirus scanning can make local dev much slower.

### API

1. Install `uv` or use a Python virtual environment directly.
2. From `apps/api`, run `uv sync --extra dev` once `uv` is available.
3. From the repo root, run `python -m uvicorn app.main:app --reload --app-dir apps/api`.

## Verification commands

### Web

```powershell
npm.cmd run test:web
npm.cmd run build:web
```

### API

```powershell
python -m pytest apps/api/tests
python -m compileall apps/api
```

## Docs

- `docs/product-spec.md`
- `docs/math-spec.md`
- `docs/architecture.md`
- `docs/milestones.md`
- `docs/assumptions.md`
