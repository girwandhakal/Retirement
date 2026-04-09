# Retirement Planner Tech Stack Research

This document plans the full-stack implementation approach for the retirement planner described in [project-plan.md](./project-plan.md).

The goal is not to pick the most fashionable stack. The goal is to pick a stack that is:

- fast to build with
- reliable for financial calculations
- strong for polished visual UI
- flexible enough for future simulations and saved scenarios
- realistic to maintain

Research basis: official docs reviewed on April 7, 2026.

Speed requirement update: UI speed is the top product priority. That means every major stack choice should prefer lower bundle size, fewer re-renders, less main-thread work, and no network dependency for core calculator interactions.

## 1. Recommended Stack At A Glance

### Frontend

- `Next.js` with App Router
- `React` + `TypeScript`
- `Tailwind CSS 4`
- `Radix Primitives`
- `shadcn/ui` selectively, only as a starting point for primitives
- `Motion` used sparingly for premium transitions
- `uPlot` for performance-critical charts
- `React Hook Form` + `Zod` for forms and validation
- native `fetch` and minimal custom hooks for server interactions in MVP

### Backend

- `FastAPI`
- `Pydantic`
- `SQLAlchemy 2.0`
- `Alembic`
- `PostgreSQL`
- `NumPy` for advanced simulation work

### Tooling

- `pnpm` for the web app
- `uv` for Python dependency and project management
- `Ruff` for Python linting/formatting
- `Vitest` for frontend/unit tests
- `Playwright` for end-to-end tests
- `pytest` for backend tests

## 2. Final Recommendation

The best stack for this project is:

- `Next.js + Tailwind + Motion + uPlot` on the frontend
- `FastAPI + PostgreSQL` on the backend

This is the best fit because the product is a calculator-heavy, visualization-heavy web app, not an admin-first CRUD system. It needs a premium-looking frontend, but the UI must still feel instant. So the stack should minimize client-side weight and reserve the backend for work that truly needs it.

## 3. Backend Framework Decision

### Recommended: FastAPI

FastAPI is the best backend choice for this product.

Why it fits:

- The app is API-first
- The domain relies on typed numeric inputs and outputs
- FastAPI works very well with validation-heavy request models
- Automatic OpenAPI docs make the API easy to inspect and test
- It is a clean fit for future Monte Carlo and simulation endpoints
- It is lighter and faster to move with than Django for this use case

### Why Not Django As The Default

Django is strong, but it is better when the product needs:

- a built-in admin early
- heavy relational CRUD
- user management and back-office workflows from day one
- content management inside the backend

For this retirement planner, the first challenge is not admin tooling. The first challenge is building a high-quality interactive calculator and simulator. Django would work, but it adds more framework than the first version really needs.

### Why Not Flask

Flask is still viable, but it would require assembling more pieces manually:

- validation
- API documentation
- structure conventions
- larger-scale app patterns

That is unnecessary here. FastAPI gives those benefits with less setup.

### Decision

Use `FastAPI` as the Python backend.

## 4. Architecture Recommendation

### Recommended Architecture: Hybrid UX + Python Service

Use a hybrid model:

- deterministic retirement calculations run in the browser for instant feedback
- the Python backend handles persistence, saved scenarios, shared links, and advanced simulations

This gives the best user experience because sliders and numeric inputs can update charts immediately without waiting on a network request.

### Performance Rule

The main planner must never depend on a round trip to feel responsive.

That means:

- typing into inputs should update locally
- slider changes should update locally
- chart redraws should stay local
- only save, load, share, and heavy simulation work should call the backend

### What Runs On The Client

Client-side calculation should cover:

- accumulation calculator
- withdrawal simulator
- combined journey timeline
- chart-ready transformed data
- quick scenario comparison

These calculations are deterministic and lightweight enough for the browser.

### What Runs On The Backend

Backend responsibilities should cover:

- saving scenarios
- loading saved scenarios
- shared scenario links
- advanced Monte Carlo simulation
- heavier stress-test scenarios
- future report generation
- future account/auth features

### Important Tradeoff

This architecture duplicates some calculation logic across TypeScript and Python.

That duplication is acceptable only if it is controlled with:

- shared JSON fixtures
- golden-result tests
- matching rounding rules
- a documented formula spec

Without those guardrails, result drift becomes a real risk.

### Alternative If We Want One Source Of Truth

If we want to avoid duplicated formulas entirely, we can make the backend authoritative and debounce API calls from the UI.

That is simpler technically, but the UX will feel less immediate. For a user-friendly calculator product, I recommend the hybrid model for MVP and strong test coverage to control drift.

## 5. Frontend Stack Recommendation

### Next.js App Router

Use `Next.js` with the App Router.

Why:

- strong fit for marketing pages plus app experience in one codebase
- good SEO for landing pages
- easy route structure for calculator sections
- modern React features
- good performance defaults
- built-in font optimization through `next/font`

Recommended usage:

- server-render landing pages and informational content
- keep the calculator shell mostly client-side where interactivity is dense
- use route groups for marketing vs app sections
- keep `"use client"` boundaries narrow so most of the app ships little or no client JavaScript

### TypeScript

Use TypeScript everywhere on the frontend.

This app has many numeric inputs and structured scenario objects. Type safety will prevent avoidable bugs.

### Tailwind CSS 4

Use `Tailwind CSS 4` as the styling layer.

Why:

- fast iteration for custom UI
- strong support for design tokens through theme variables
- easy control over blur, transparency, shadow, gradients, and spacing
- good fit for a bespoke visual language instead of a generic component library look

This is especially good for the frosted glass requirement because Tailwind already supports `backdrop-filter` and `backdrop-blur` utilities.

It also helps performance because it avoids shipping a large runtime styling system to the browser.

### Radix Primitives + Selective shadcn/ui

Use `Radix Primitives` for accessibility-critical pieces:

- tabs
- dialog
- tooltip
- popover
- slider
- select

Use `shadcn/ui` only selectively as a code accelerator for some of those primitives, then restyle heavily.

Why this approach:

- Radix is accessible and unstyled
- it gives full control over the visual system
- it avoids getting boxed into a vendor design language
- it is much better for a minimal glass UI than adopting a full Material-style component suite
- it avoids the bundle cost and abstraction weight of a large full-component framework

## 6. Charting Recommendation

### Recommended: uPlot

Use `uPlot` for the main planner charts.

Why it is the best fit for a speed-first build:

- very small bundle footprint
- built specifically for fast time-series rendering
- handles dense financial-style line and area charts very efficiently
- strong cursor and zoom performance
- better aligned with the user's speed-first requirement than a heavier chart abstraction

This project needs:

- portfolio growth line charts
- drawdown line and area charts
- contributions vs gains breakdown charts
- synchronized hover states across scenarios

uPlot handles the core chart shapes we need well. This recommendation is based on its official positioning as a small, fast time-series charting library and its published benchmark data. The tradeoff is that chart styling and interactions will require a bit more custom wrapper work than Recharts.

### How To Keep Charts Looking Premium

Do not use default chart styling.

Wrap uPlot with custom components:

- `GlassChartCard`
- `ChartTooltip`
- `ChartLegend`
- `ScenarioComparisonChart`

Style charts with:

- custom surrounding glass surfaces
- thin grid lines
- custom HTML tooltips and legends
- subtle motion on reveal of the card, not heavy animation inside the chart
- branded tooltip surfaces
- shaded danger/safe zones for withdrawals

### When To Reconsider The Chart Library

If we later decide we need more decorative chart choreography than speed, `Recharts` or `visx` could be reconsidered for selected views. For the core planner, `uPlot` is the right default because speed has priority.

## 7. Forms And State

### Forms

Use `React Hook Form` with `Zod`.

Why:

- performant local form state
- fewer unnecessary re-renders
- good validation ergonomics
- easy to organize basic vs advanced inputs

This matters because the planner will have many related numeric inputs and optional advanced assumptions.

### State Strategy

Use a simple layered state model:

- local form state in `React Hook Form`
- derived calculation state in calculator hooks
- infrequent backend calls through native `fetch`
- local scenario persistence in `localStorage` for anonymous users

Avoid adding a global client state library or query cache at the start unless complexity forces it later. This is a deliberate speed and bundle-size choice.

## 8.5. Performance-First UI Rules

These are implementation rules, not just stack choices.

- ship the least amount of JavaScript possible
- use Server Components by default and Client Components only where interactivity is required
- split advanced simulation panels and heavy visual modules with lazy loading
- do not block calculator updates on backend responses
- do not run heavy Monte Carlo work on the main thread
- prefer CSS transitions for hover and small motion
- use `Motion` only for layout transitions and key moments
- self-host fonts with `next/font` and keep font families limited
- aggregate or sample chart data when full detail does not help the user
- measure bundle size and Core Web Vitals from the start

I recommend treating these as non-negotiable engineering constraints. The exact thresholds are my recommendation, not a requirement from framework docs:

- target near-instant route transitions after first load
- keep calculator updates visually immediate during typing and slider input
- keep the initial interactive bundle aggressively small for the main planner route

## 8. Design System Strategy

The UI requirement is:

- minimalistic
- frosted glass look
- beautiful charts
- subtle microanimations

The stack above can achieve that well if the visual system is defined intentionally.

### Visual Implementation Rules

- use layered gradient backgrounds, not flat fills
- use semi-transparent glass panels with thin bright borders
- use backdrop blur sparingly on key surfaces, not everywhere
- use a restrained palette with strong contrast
- use one display font and one body font through `next/font`
- animate opacity, transform, and layout more often than blur or shadow

### Motion Strategy

Use `Motion` for:

- staggered page entrance
- card reveal
- tab transitions
- chart container reveal
- number-card updates
- scenario compare transitions

Use regular CSS transitions for trivial hover states. This is important for speed. Motion should enhance structure, not animate everything.

### Accessibility Guardrails

- respect `prefers-reduced-motion`
- maintain readable contrast on translucent surfaces
- keep labels explicit for every financial input
- provide text/table fallback for chart data when needed

## 9. Backend Architecture

### API Shape

Suggested initial endpoints:

- `POST /v1/calc/accumulation`
- `POST /v1/calc/withdrawal`
- `POST /v1/calc/journey`
- `POST /v1/calc/monte-carlo`
- `POST /v1/scenarios`
- `GET /v1/scenarios/{id}`
- `PATCH /v1/scenarios/{id}`
- `POST /v1/share-links`
- `GET /v1/share-links/{token}`

### Service Layers

Inside the FastAPI app, keep a clear split:

- `api`: route handlers and request/response models
- `domain`: financial formulas and simulation logic
- `services`: orchestration and scenario workflows
- `repositories`: database access

This separation is important because financial logic should be testable without HTTP or database coupling.

### Data Precision Guidance

Use:

- `Decimal` for deterministic money calculations where exact rounding matters
- `float` or `NumPy` arrays for simulation-heavy probabilistic models

Do not round values too early. Round for presentation at the boundary layer.

## 10. Database Recommendation

### Recommended: PostgreSQL

Use `PostgreSQL` for persisted scenarios and future user data.

Why:

- reliable relational database
- strong long-term foundation
- fits structured scenario storage well
- supports future JSON fields where helpful

### Initial Persistence Model

Suggested tables:

- `users`
- `scenarios`
- `scenario_versions`
- `share_links`

For the earliest MVP, anonymous users can save to browser storage only. The database becomes necessary when we add:

- cross-device persistence
- accounts
- shareable links
- saved history

## 11. ORM And Migration Stack

Use:

- `SQLAlchemy 2.0`
- `Alembic`

Why:

- mature ecosystem
- strong typing direction
- clear migration story
- works very well with FastAPI

## 12. Python Simulation Stack

Use:

- standard Python for core formulas
- `NumPy` for Monte Carlo and stress testing

This allows the first version to stay understandable while giving a clean upgrade path for:

- sequence-of-returns stress tests
- random market return sampling
- probability-of-success outputs

Do not add Celery or Redis at the start.

Only add async job infrastructure if:

- simulations become slow enough to affect UX
- exports or reports become background jobs
- Monte Carlo runs become materially heavier

## 13. Testing Strategy

### Frontend

- `Vitest` for unit and hook tests
- `Playwright` for end-to-end flows

### Backend

- `pytest` for domain and API tests

### Cross-Layer Calculation Safety

Because the recommended architecture has client and server calculation layers, create shared test fixtures such as:

- conservative saver
- aggressive saver
- early retiree
- high withdrawal stress case
- inflation-heavy case

Both the TypeScript calculator and Python calculator should be tested against the same expected outputs for deterministic models.

## 14. Monorepo Structure Recommendation

Use a simple repository structure:

```text
/apps
  /web         # Next.js app
  /api         # FastAPI app
/packages
  /ui          # optional shared frontend components later
  /config      # optional shared TS config later
/infra
  /docker      # local infra if needed
/.agent
  project-plan.md
  research.md
```

Do not start with an overbuilt monorepo toolchain. A simple root structure is enough.

## 15. Local Development Recommendation

### Web

- `pnpm` project

### API

- `uv` project

### Local Infra

Use lightweight local development:

- frontend dev server
- backend dev server
- optional PostgreSQL container once persistence is added

This keeps the first build easy to start and easy to change.

## 16. Deployment Recommendation

Keep deployment architecture simple:

- deploy the Next.js frontend separately
- deploy the FastAPI backend separately
- expose the backend under the same main domain through reverse proxy or rewrite rules
- use managed PostgreSQL in production

Same-origin deployment is preferable because it avoids unnecessary CORS complexity and makes auth easier later.

## 17. What I Would Actually Build First

### Phase 1

- Next.js frontend
- Tailwind design tokens
- glassmorphism UI system
- client-side deterministic calculators
- uPlot visualizations
- local scenario save in browser storage

### Phase 2

- FastAPI backend
- scenario persistence APIs
- PostgreSQL
- shareable scenario links

### Phase 3

- Monte Carlo simulation endpoint
- stress tests
- richer scenario compare
- optional auth

## 18. Final Stack Decision

If the goal is to build this product effectively and keep room for future sophistication, the stack should be:

- `Next.js + React + TypeScript`
- `Tailwind CSS 4 + Radix + selective Motion`
- `uPlot`
- `React Hook Form + Zod + native fetch`
- `FastAPI + Pydantic + SQLAlchemy + Alembic`
- `PostgreSQL + NumPy`

This stack is the best balance of:

- speed of implementation
- UI speed
- UI quality
- maintainability
- simulation flexibility
- long-term scalability

## 19. Official References

- Next.js App Router: https://nextjs.org/docs/app
- Next.js font optimization: https://nextjs.org/docs/app/getting-started/fonts
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Tailwind backdrop blur: https://tailwindcss.com/docs/backdrop-blur
- Motion for React: https://motion.dev/docs/react
- Radix introduction: https://www.radix-ui.com/primitives/docs/overview/introduction
- Radix accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- shadcn/ui for Next.js: https://ui.shadcn.com/docs/installation/next
- uPlot: https://leeoniya.github.io/uPlot/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- FastAPI: https://fastapi.tiangolo.com/
- FastAPI features: https://fastapi.tiangolo.com/features/
- Pydantic: https://docs.pydantic.dev/latest/why/
- SQLAlchemy ORM: https://docs.sqlalchemy.org/20/orm/
- Alembic: https://alembic.sqlalchemy.org/en/latest/
- PostgreSQL current docs: https://www.postgresql.org/docs/current/
- NumPy docs: https://numpy.org/doc/stable/
- uv: https://docs.astral.sh/uv/
- Ruff linter: https://docs.astral.sh/ruff/linter/
- Ruff formatter: https://docs.astral.sh/ruff/formatter/
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- pytest: https://docs.pytest.org/
