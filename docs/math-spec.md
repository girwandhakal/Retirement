# Math Spec

## Accumulation Model

Inputs:

- current age
- retirement age
- initial balance
- monthly contribution
- annual return before retirement
- compounding frequency
- annual contribution growth rate
- retirement goal

Rules:

- monthly contributions are added before growth is applied in each compounding interval
- contribution growth is applied once per year
- balances are rounded to cents only at output boundaries

Outputs:

- retirement balance
- total contributions
- total growth
- monthly income estimate using `balance * 0.04 / 12`
- goal gap as `retirementBalance - retirementGoal`
- goal funding ratio as `retirementBalance / retirementGoal`
- required monthly contribution solved by binary search

## Withdrawal Model

Inputs:

- retirement starting balance override or current/projected balance
- withdrawal amount and frequency
- annual return during retirement
- inflation rate
- annual withdrawal increase
- retirement age
- life expectancy

Rules:

- withdrawals happen on the selected interval
- growth is applied only while the balance remains positive
- annual withdrawal bump is:

`(1 + inflationRate) * (1 + annualWithdrawalIncrease) - 1`

Outputs:

- ending balance
- years covered
- depletion age when the balance first turns negative
- total withdrawals
- sustainability flag through the life expectancy target

## Journey Model

The journey model runs accumulation first, then uses the projected retirement balance as the withdrawal starting balance.

## Safety Notes

- this is a deterministic model, not a probability model
- the planner does not include taxes, fees, employer match logic, Social Security, or pension income
- frontend and backend deterministic calculators are kept aligned through shared fixtures and matching formulas
