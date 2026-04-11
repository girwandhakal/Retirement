from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from app.schemas.planner import (
    AccumulationResult,
    JourneyResult,
    PlannerResultSet,
    PlannerInput,
    TimelinePoint,
    WithdrawalResult,
)

TWO_PLACES = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")

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

WithdrawalSimulation = tuple[WithdrawalResult, float]


def to_decimal(value: float) -> Decimal:
    return Decimal(str(value))


def round_money(value: Decimal) -> float:
    return float(value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP))


def round_ratio(value: Decimal) -> float:
    return float(value.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP))


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


def run_accumulation(
    payload: PlannerInput, monthly_contribution_override: Decimal | None = None
) -> dict[str, object]:
    years_to_retirement = payload.retirement_age - payload.current_age
    total_months = years_to_retirement * 12
    interval = COMPOUNDING_INTERVALS[payload.compounding_frequency]

    age = payload.current_age
    balance = to_decimal(payload.initial_balance)
    total_contributions = to_decimal(payload.initial_balance)
    total_growth = Decimal("0")
    monthly_contribution = (
        monthly_contribution_override
        if monthly_contribution_override is not None
        else to_decimal(payload.monthly_contribution)
    )

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

    return {
        "years_to_retirement": years_to_retirement,
        "retirement_balance": round_money(balance),
        "total_contributions": round_money(total_contributions),
        "total_growth": round_money(total_growth),
        "monthly_income_estimate": round_money(
            balance * Decimal("0.04") / Decimal("12")
        ),
        "timeline": timeline,
    }


def solve_required_monthly_contribution(payload: PlannerInput) -> dict[str, float | bool]:
    if payload.retirement_goal <= 0:
        return {
            "additional_monthly_contribution_needed": 0.0,
            "can_reach_goal": True,
            "required_monthly_contribution": 0.0,
        }

    current_outcome = run_accumulation(payload)
    low = Decimal("0")
    high = max(to_decimal(payload.monthly_contribution), Decimal("500"))
    can_reach_goal = current_outcome["retirement_balance"] >= payload.retirement_goal

    if not can_reach_goal:
        for _ in range(18):
            if run_accumulation(payload, high)["retirement_balance"] >= payload.retirement_goal:
                can_reach_goal = True
                break
            high *= Decimal("2")

    if not can_reach_goal:
        return {
            "additional_monthly_contribution_needed": round_money(
                max(Decimal("0"), high - to_decimal(payload.monthly_contribution))
            ),
            "can_reach_goal": False,
            "required_monthly_contribution": round_money(high),
        }

    for _ in range(32):
        mid = (low + high) / Decimal("2")
        result = run_accumulation(payload, mid)

        if result["retirement_balance"] >= payload.retirement_goal:
            high = mid
        else:
            low = mid

    return {
        "additional_monthly_contribution_needed": round_money(
            max(Decimal("0"), high - to_decimal(payload.monthly_contribution))
        ),
        "can_reach_goal": True,
        "required_monthly_contribution": round_money(high),
    }


def calculate_accumulation(payload: PlannerInput) -> AccumulationResult:
    accumulation = run_accumulation(payload)
    contribution_target = solve_required_monthly_contribution(payload)
    goal_gap = (
        to_decimal(accumulation["retirement_balance"]) - to_decimal(payload.retirement_goal)
        if payload.retirement_goal > 0
        else Decimal("0")
    )

    return AccumulationResult(
        additional_monthly_contribution_needed=contribution_target[
            "additional_monthly_contribution_needed"
        ],
        can_reach_goal=contribution_target["can_reach_goal"],
        goal_funding_ratio=(
            round_ratio(
                to_decimal(accumulation["retirement_balance"])
                / to_decimal(payload.retirement_goal)
            )
            if payload.retirement_goal > 0
            else 0.0
        ),
        goal_gap=round_money(goal_gap),
        monthly_income_estimate=accumulation["monthly_income_estimate"],
        required_monthly_contribution=contribution_target[
            "required_monthly_contribution"
        ],
        retirement_balance=accumulation["retirement_balance"],
        timeline=accumulation["timeline"],
        total_contributions=accumulation["total_contributions"],
        total_growth=accumulation["total_growth"],
        years_to_retirement=accumulation["years_to_retirement"],
    )


def resolve_standalone_withdrawal_start(payload: PlannerInput) -> Decimal:
    if payload.retirement_starting_balance > 0:
        return to_decimal(payload.retirement_starting_balance)
    return to_decimal(payload.initial_balance)


def solve_max_sustainable_monthly_withdrawal(
    payload: PlannerInput, starting_balance: Decimal
) -> float:
    if starting_balance <= 0:
        return 0.0

    monthly_payload = payload.model_copy(
        update={"withdrawal_amount": 0, "withdrawal_frequency": "monthly"}
    )

    low = Decimal("0")
    high = max(starting_balance / Decimal("12"), Decimal("1000"))

    for _ in range(24):
        _, raw_ending_balance = simulate_withdrawal(
            monthly_payload, starting_balance, high, False
        )
        if raw_ending_balance <= 0:
            break
        high *= Decimal("2")

    for _ in range(36):
        mid = (low + high) / Decimal("2")
        _, raw_ending_balance = simulate_withdrawal(
            monthly_payload, starting_balance, mid, False
        )
        if raw_ending_balance > 0:
            low = mid
        else:
            high = mid

    rounded_low = to_decimal(round_money(low))
    rounded_high = to_decimal(round_money(high))
    candidates = [rounded_low, rounded_high]

    best_candidate = candidates[0]
    _, best_raw_ending_balance = simulate_withdrawal(
        monthly_payload, starting_balance, best_candidate, False
    )
    best_distance = abs(best_raw_ending_balance)

    for candidate in candidates[1:]:
        _, raw_ending_balance = simulate_withdrawal(
            monthly_payload, starting_balance, candidate, False
        )
        distance = abs(raw_ending_balance)

        if distance < best_distance or (
            distance == best_distance and candidate < best_candidate
        ):
            best_candidate = candidate
            best_distance = distance

    return round_money(best_candidate)


def calculate_withdrawal(
    payload: PlannerInput, starting_balance: Decimal | None = None
) -> WithdrawalResult:
    return simulate_withdrawal(payload, starting_balance)[0]


def simulate_withdrawal(
    payload: PlannerInput,
    starting_balance: Decimal | None = None,
    initial_withdrawal_amount: Decimal | None = None,
    allow_forever_extension: bool = True,
) -> WithdrawalSimulation:
    total_months = (payload.life_expectancy - payload.retirement_age) * 12
    compounding = COMPOUNDING_INTERVALS[payload.compounding_frequency]
    withdrawal_interval = WITHDRAWAL_INTERVALS[payload.withdrawal_frequency]
    withdrawal_growth_rate = yearly_withdrawal_bump(payload)
    resolved_starting_balance = (
        starting_balance
        if starting_balance is not None
        else resolve_standalone_withdrawal_start(payload)
    )
    withdrawal_start = (
        initial_withdrawal_amount
        if initial_withdrawal_amount is not None
        else to_decimal(payload.withdrawal_amount)
    )
    max_simulation_months = (
        600 * 12
        if withdrawal_start > 0
        and allow_forever_extension
        and withdrawal_growth_rate <= to_decimal(payload.annual_return_during_retirement)
        else total_months
    )

    age = payload.retirement_age
    balance = resolved_starting_balance
    raw_balance = resolved_starting_balance
    total_growth = Decimal("0")
    total_withdrawals = Decimal("0")
    withdrawal_amount = withdrawal_start
    depletion_age: float | None = None
    lasts_forever = False

    timeline = [
        build_point(age, balance, Decimal("0"), total_growth, total_withdrawals)
    ]

    for month in range(1, max_simulation_months + 1):
        raw_balance_was_positive = raw_balance > 0
        scheduled_withdrawal_month = month % withdrawal_interval == 0

        if scheduled_withdrawal_month:
            raw_balance -= withdrawal_amount

            if balance > 0:
                actual_withdrawal = min(balance, withdrawal_amount)
                balance -= actual_withdrawal
                total_withdrawals += actual_withdrawal

        if month % compounding["months"] == 0:
            if raw_balance > 0:
                raw_balance += (
                    raw_balance
                    * to_decimal(payload.annual_return_during_retirement)
                    / compounding["rate_divisor"]
                )

            if balance > 0:
                growth = (
                    balance
                    * to_decimal(payload.annual_return_during_retirement)
                    / compounding["rate_divisor"]
                )
                balance += growth
                total_growth += growth

        if (
            depletion_age is None
            and raw_balance <= 0
            and (
                raw_balance_was_positive
                or (scheduled_withdrawal_month and withdrawal_amount > 0)
            )
        ):
            depletion_age = round_number(payload.retirement_age + month / 12)

        if month % 12 == 0:
            age += 1
            if month <= total_months:
                timeline.append(
                    build_point(age, balance, Decimal("0"), total_growth, total_withdrawals)
                )
            withdrawal_amount *= Decimal("1") + withdrawal_growth_rate

        if (
            allow_forever_extension
            and
            month > total_months
            and depletion_age is None
            and withdrawal_growth_rate
            <= to_decimal(payload.annual_return_during_retirement)
            and raw_balance > resolved_starting_balance
        ):
            lasts_forever = True
            break

        if depletion_age is not None:
            break

    if (
        allow_forever_extension
        and
        depletion_age is None
        and withdrawal_start > 0
        and withdrawal_growth_rate <= to_decimal(payload.annual_return_during_retirement)
        and max_simulation_months > total_months
        and raw_balance > 0
    ):
        lasts_forever = True

    years_covered = (
        depletion_age - payload.retirement_age if depletion_age is not None else total_months / 12
    )

    return (
        WithdrawalResult(
            starting_balance=round_money(resolved_starting_balance),
            ending_balance=round_money(balance),
            lasts_forever=lasts_forever,
            total_withdrawals=round_money(total_withdrawals),
            years_covered=round_number(years_covered),
            depletion_age=depletion_age,
            sustainable_through_life_expectancy=(
                depletion_age is None or depletion_age >= payload.life_expectancy
            ),
            timeline=timeline,
        ),
        round_money(raw_balance),
    )


def calculate_journey(payload: PlannerInput) -> JourneyResult:
    accumulation = calculate_accumulation(payload)
    retirement_balance = to_decimal(accumulation.retirement_balance)
    withdrawal, raw_ending_balance = simulate_withdrawal(
        payload, retirement_balance
    )

    return JourneyResult(
        accumulation=accumulation,
        max_sustainable_monthly_withdrawal=solve_max_sustainable_monthly_withdrawal(
            payload, retirement_balance
        ),
        withdrawal=withdrawal,
        shortfall_or_surplus=raw_ending_balance,
        timeline=[*accumulation.timeline[:-1], *withdrawal.timeline],
    )


def calculate_planner(payload: PlannerInput) -> PlannerResultSet:
    accumulation = calculate_accumulation(payload)
    standalone_withdrawal = calculate_withdrawal(payload)
    retirement_balance = to_decimal(accumulation.retirement_balance)
    journey_withdrawal, raw_ending_balance = simulate_withdrawal(
        payload, retirement_balance
    )
    journey = JourneyResult(
        accumulation=accumulation,
        max_sustainable_monthly_withdrawal=solve_max_sustainable_monthly_withdrawal(
            payload, retirement_balance
        ),
        withdrawal=journey_withdrawal,
        shortfall_or_surplus=raw_ending_balance,
        timeline=[*accumulation.timeline[:-1], *journey_withdrawal.timeline],
    )

    return PlannerResultSet(
        accumulation=accumulation,
        standalone_withdrawal=standalone_withdrawal,
        journey=journey,
    )
