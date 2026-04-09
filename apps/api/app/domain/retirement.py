from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from app.schemas.planner import (
    AccumulationResult,
    JourneyResult,
    PlannerInput,
    TimelinePoint,
    WithdrawalResult,
)

TWO_PLACES = Decimal("0.01")

COMPOUNDING_INTERVALS = {
    "monthly": {"months": 1, "rate_divisor": Decimal("12")},
    "quarterly": {"months": 3, "rate_divisor": Decimal("4")},
    "annual": {"months": 12, "rate_divisor": Decimal("1")},
}

WITHDRAWAL_INTERVALS = {
    "monthly": 1,
    "quarterly": 3,
    "annual": 12,
}


def to_decimal(value: float) -> Decimal:
    return Decimal(str(value))


def round_money(value: Decimal) -> float:
    return float(value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP))


def round_number(value: float | Decimal) -> float:
    return round(float(value), 2)


def build_point(
    age: int,
    balance: Decimal,
    contributions: Decimal,
    growth: Decimal,
    withdrawals: Decimal,
) -> TimelinePoint:
    return TimelinePoint(
        age=age,
        balance=round_money(balance),
        contributions=round_money(contributions),
        growth=round_money(growth),
        withdrawals=round_money(withdrawals),
    )


def yearly_withdrawal_bump(payload: PlannerInput) -> Decimal:
    inflation = Decimal("1") + to_decimal(payload.inflation_rate)
    adjustment = Decimal("1") + to_decimal(payload.annual_withdrawal_increase)
    return (inflation * adjustment) - Decimal("1")


def calculate_accumulation(payload: PlannerInput) -> AccumulationResult:
    years_to_retirement = payload.retirement_age - payload.current_age
    total_months = years_to_retirement * 12
    interval = COMPOUNDING_INTERVALS[payload.compounding_frequency]

    age = payload.current_age
    balance = to_decimal(payload.initial_balance)
    total_contributions = to_decimal(payload.initial_balance)
    total_growth = Decimal("0")
    monthly_contribution = to_decimal(payload.monthly_contribution)

    timeline = [
        build_point(age, balance, total_contributions, total_growth, Decimal("0"))
    ]

    for month in range(1, total_months + 1):
        balance += monthly_contribution
        total_contributions += monthly_contribution

        if month % interval["months"] == 0:
            growth = (
                balance
                * to_decimal(payload.annual_return_before_retirement)
                / interval["rate_divisor"]
            )
            balance += growth
            total_growth += growth

        if month % 12 == 0:
            age += 1
            timeline.append(
                build_point(age, balance, total_contributions, total_growth, Decimal("0"))
            )
            monthly_contribution *= Decimal("1") + to_decimal(
                payload.annual_contribution_growth_rate
            )

    return AccumulationResult(
        years_to_retirement=years_to_retirement,
        retirement_balance=round_money(balance),
        total_contributions=round_money(total_contributions),
        total_growth=round_money(total_growth),
        monthly_income_estimate=round_money(balance * Decimal("0.04") / Decimal("12")),
        timeline=timeline,
    )


def resolve_standalone_withdrawal_start(payload: PlannerInput) -> Decimal:
    if payload.retirement_starting_balance > 0:
        return to_decimal(payload.retirement_starting_balance)
    return to_decimal(payload.initial_balance)


def calculate_withdrawal(
    payload: PlannerInput, starting_balance: Decimal | None = None
) -> WithdrawalResult:
    total_months = (payload.life_expectancy - payload.retirement_age) * 12
    compounding = COMPOUNDING_INTERVALS[payload.compounding_frequency]
    withdrawal_interval = WITHDRAWAL_INTERVALS[payload.withdrawal_frequency]
    resolved_starting_balance = (
        starting_balance
        if starting_balance is not None
        else resolve_standalone_withdrawal_start(payload)
    )

    age = payload.retirement_age
    balance = resolved_starting_balance
    total_growth = Decimal("0")
    total_withdrawals = Decimal("0")
    withdrawal_amount = to_decimal(payload.withdrawal_amount)
    depletion_age: float | None = None

    timeline = [
        build_point(age, balance, Decimal("0"), total_growth, total_withdrawals)
    ]

    for month in range(1, total_months + 1):
        if month % withdrawal_interval == 0:
            balance -= withdrawal_amount
            total_withdrawals += withdrawal_amount

        if balance > 0 and month % compounding["months"] == 0:
            growth = (
                balance
                * to_decimal(payload.annual_return_during_retirement)
                / compounding["rate_divisor"]
            )
            balance += growth
            total_growth += growth

        if balance <= 0 and depletion_age is None:
            depletion_age = round_number(payload.retirement_age + month / 12)

        if month % 12 == 0:
            age += 1
            timeline.append(
                build_point(age, balance, Decimal("0"), total_growth, total_withdrawals)
            )
            withdrawal_amount *= Decimal("1") + yearly_withdrawal_bump(payload)

    years_covered = (
        depletion_age - payload.retirement_age
        if depletion_age is not None
        else total_months / 12
    )

    return WithdrawalResult(
        starting_balance=round_money(resolved_starting_balance),
        ending_balance=round_money(balance),
        total_withdrawals=round_money(total_withdrawals),
        years_covered=round_number(years_covered),
        depletion_age=depletion_age,
        sustainable_through_life_expectancy=balance >= 0,
        timeline=timeline,
    )


def calculate_journey(payload: PlannerInput) -> JourneyResult:
    accumulation = calculate_accumulation(payload)
    withdrawal = calculate_withdrawal(
        payload, to_decimal(accumulation.retirement_balance)
    )

    return JourneyResult(
        accumulation=accumulation,
        withdrawal=withdrawal,
        shortfall_or_surplus=withdrawal.ending_balance,
        timeline=[*accumulation.timeline[:-1], *withdrawal.timeline],
    )
