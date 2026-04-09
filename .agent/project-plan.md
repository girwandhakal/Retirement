# Retirement Planner Website Project Plan

## 1. Product Goal

Build a retirement planning website that feels simple enough for beginners but useful enough for serious planning. The product should help users answer four core questions quickly:

- How much will my portfolio grow before retirement?
- How much should I invest to reach my retirement goal?
- How long will my money last once I start withdrawing?
- What changes have the biggest impact on my retirement outcome?

The site should prioritize clarity, trust, and fast experimentation over financial jargon.

## 2. Target Users

- Beginner investors who want a simple retirement calculator
- Mid-career workers trying to estimate retirement readiness
- Near-retirees testing withdrawal strategies
- DIY planners comparing different savings and retirement scenarios

## 3. Core Product Principles

- Make the main calculator usable in under 2 minutes
- Use plain-language labels instead of finance-heavy terminology
- Show results visually, not just as a single number
- Let users compare scenarios without re-entering everything
- Provide smart defaults so blank states are not intimidating
- Separate essential inputs from advanced options
- Be transparent about assumptions and limitations

## 4. Primary User Flows

### A. Retirement Growth Planner

The user enters:

- Current age
- Retirement age
- Initial investment / current portfolio balance
- Monthly contribution
- Expected annual portfolio growth rate
- Compounding frequency
- Annual contribution growth rate

The planner shows:

- Projected portfolio value at retirement
- Total contributions
- Total investment growth
- Estimated annual/monthly retirement income potential
- Year-by-year growth table
- A chart of contributions vs investment gains over time

### B. Retirement Withdrawal Simulator

The user enters:

- Starting retirement portfolio
- Withdrawal amount
- Withdrawal frequency
- Expected annual portfolio growth rate in retirement
- Inflation rate
- Annual withdrawal increase
- Retirement start age

The simulator shows:

- How many years the portfolio may last
- Estimated age when funds run out
- Remaining balance by year
- Best-case / expected / conservative scenarios
- Warnings when withdrawals are likely unsustainable

### C. Combined Retirement Journey

This mode connects both stages:

- Accumulation years before retirement
- Withdrawal years during retirement

This should become the main experience because it answers the full user story from saving to spending.

## 5. MVP Features

### Essential Inputs

- Current age
- Retirement age
- Life expectancy target
- Initial portfolio balance
- Monthly contribution
- Expected annual return before retirement
- Expected annual return during retirement
- Contribution growth per year
- Withdrawal amount
- Withdrawal frequency
- Inflation rate
- Compounding frequency

### Essential Outputs

- Portfolio value at retirement
- Total contributed amount
- Total returns earned
- Monthly income supported in retirement
- Portfolio longevity in retirement
- Depletion age / depletion year
- Shortfall or surplus versus target retirement goal

### Essential Visuals

- Portfolio growth line chart
- Retirement drawdown chart
- Contributions vs gains breakdown
- Simple year-by-year table

### Essential UX Features

- Real-time calculation as inputs change
- Tooltips and short explanations for every financial field
- Preset example scenarios for beginners
- Mobile-friendly form layout
- Currency and percentage formatting
- Input validation with friendly error messages
- Save/share scenario locally

## 6. Features That Would Make It More Useful

### High-Value Next Features

- Compare multiple scenarios side by side
- Toggle nominal vs inflation-adjusted values
- Include Social Security / pension income
- Set a target retirement income and solve backward
- Show safe withdrawal rate estimate
- Add one-time future deposits or expenses
- Support annual, monthly, or biweekly contributions
- Support annual, monthly, or quarterly withdrawals

### Advanced Planning Features

- Monte Carlo simulation instead of fixed-return-only modeling
- Market crash / bad early retirement sequence stress tests
- Tax-aware retirement estimates
- Roth vs traditional account assumptions
- Required minimum distribution planning
- Asset allocation glide path by age
- Healthcare and long-term care expense assumptions
- Partner/spouse joint planning

## 7. UX Strategy

### Information Architecture

Keep the interface organized into three clear tabs or steps:

1. Save for Retirement
2. Withdraw in Retirement
3. Compare Scenarios

There should also be a simplified landing experience with one strong call to action:

- "See if your retirement plan is on track"

### Input Design

- Start with only the most important fields visible
- Hide advanced assumptions in an expandable section
- Pre-fill sensible defaults so users are never staring at an empty calculator
- Use sliders only where they improve speed; keep numeric inputs for precision
- Show units directly inside labels, such as "Monthly contribution ($)"

### Result Design

- Lead with 2-4 headline results
- Follow with charts and a year-by-year breakdown
- Explain what the result means in plain language
- Show how sensitive the outcome is to return rate, retirement age, and withdrawal amount

## 8. Trust and Usability Requirements

- Display a visible assumptions disclaimer
- Avoid giving the impression of guaranteed returns
- Explain that results are estimates, not financial advice
- Show formulas or methodology in a help section
- Make the app fast, accessible, and easy to use on mobile
- Use large readable typography and clear color contrast

## 9. Recommended MVP Scope

The first version should focus on doing a few things well:

- Retirement accumulation calculator
- Retirement withdrawal simulator
- Combined end-to-end planner
- Clean charts
- Scenario saving in browser storage
- Beginner-friendly explanations

The first version should avoid overbuilding:

- No account syncing
- No login requirement
- No tax engine at launch
- No Monte Carlo until the fixed-return model is solid and understandable

## 10. Suggested Build Phases

### Phase 1: Foundation

- Define formulas and assumptions
- Build calculator form structure
- Build accumulation and withdrawal calculation engine
- Add charts and summary cards

### Phase 2: User-Friendly Layer

- Add presets, tooltips, and smart defaults
- Improve validation and empty states
- Add scenario compare and save
- Polish responsive design

### Phase 3: Advanced Planning

- Add inflation-aware reporting
- Add Social Security / pension income
- Add stress-test scenarios
- Add Monte Carlo simulation

## 11. Open Questions To Decide Early

- Will the app be US-focused only, or support other countries later?
- Should the default results be shown in nominal dollars, real dollars, or both?
- Do we want age-based planning as the default, or simple years-until-retirement inputs?
- Should the first release include Social Security and pension income?
- How much educational content should be built directly into the calculator?

## 12. Recommended First Build Direction

The best initial product is likely a one-page retirement planner with:

- A simple guided form
- A retirement savings projection
- A retirement withdrawal simulator
- A charted timeline from today through retirement depletion
- A few scenario presets
- Plain-language explanations throughout

That would be enough to make the site genuinely useful while still keeping scope controlled.
