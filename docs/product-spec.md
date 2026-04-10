# Product Spec

## Goal

Build a fast, no-login retirement planner that helps a user answer:

- how much their portfolio may grow before retirement
- how much they need to save to reach a retirement target
- how long a withdrawal plan may last
- which changes have the biggest effect on the outcome

## MVP Experience

The main planner is a single-page experience with three deterministic views:

- Save for retirement
- Withdraw in retirement
- Full retirement journey

The page must also support:

- preset starting scenarios
- local scenario save/load
- JSON import/export
- side-by-side scenario comparison
- plain-language summaries
- visible assumptions and disclaimers

## Non-Goals

- login or account syncing
- tax modeling
- Social Security or pension modeling
- Monte Carlo in the main user flow
- advisory claims or guaranteed-return messaging

## Success Criteria

- edits feel immediate on desktop and mobile
- core calculator works without a network call
- charts and table stay in sync with the same normalized outputs
- saved scenarios remain local to the browser
- assumptions are visible and understandable
