from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.domain.retirement import (
    calculate_accumulation,
    calculate_journey,
    calculate_planner,
    calculate_withdrawal,
    round_money,
    yearly_withdrawal_bump,
)
from app.main import app
from app.schemas.planner import PlannerInput

client = TestClient(app)


def make_payload(**overrides: object) -> PlannerInput:
    values: dict[str, object] = {
        "currentAge": 40,
        "retirementAge": 65,
        "lifeExpectancy": 90,
        "initialBalance": 100_000,
        "retirementStartingBalance": 0,
        "retirementGoal": 1_000_000,
        "monthlyContribution": 1_000,
        "annualReturnBeforeRetirement": 0.06,
        "annualReturnDuringRetirement": 0.05,
        "compoundingFrequency": "monthly",
        "annualContributionGrowthRate": 0.03,
        "withdrawalAmount": 4_000,
        "withdrawalFrequency": "monthly",
        "inflationRate": 0.02,
        "annualWithdrawalIncrease": 0.01,
    }
    values.update(overrides)
    return PlannerInput.model_validate(values)


def test_round_money_uses_two_decimal_half_up_rounding() -> None:
    assert round_money(Decimal("1.005")) == 1.01
    assert round_money(Decimal("1.004")) == 1.00


@pytest.mark.parametrize(
    ("frequency", "periods", "rate_divisor"),
    [
        ("monthly", 12, Decimal("12")),
        ("quarterly", 4, Decimal("4")),
        ("annual", 1, Decimal("1")),
    ],
)
def test_accumulation_compounding_frequency_matches_periodic_formula(
    frequency: str, periods: int, rate_divisor: Decimal
) -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=41,
        initialBalance=1_200,
        monthlyContribution=0,
        annualReturnBeforeRetirement=0.12,
        compoundingFrequency=frequency,
        annualContributionGrowthRate=0,
        retirementGoal=0,
    )

    result = calculate_accumulation(payload)
    expected = (
        Decimal("1200") * (Decimal("1") + Decimal("0.12") / rate_divisor) ** periods
    )

    assert result.retirement_balance == round_money(expected)
    assert result.total_contributions == 1_200
    assert result.total_growth == round_money(expected - Decimal("1200"))


def test_accumulation_zero_return_tracks_contributions_and_timeline() -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=42,
        initialBalance=1_000,
        monthlyContribution=100,
        annualReturnBeforeRetirement=0,
        annualContributionGrowthRate=0,
        retirementGoal=0,
    )

    result = calculate_accumulation(payload)

    assert result.retirement_balance == 3_400
    assert result.total_contributions == 3_400
    assert result.total_growth == 0
    assert result.monthly_income_estimate == round(3_400 * 0.04 / 12, 2)
    assert [point.age for point in result.timeline] == [40, 41, 42]
    assert result.timeline[-1].balance == result.retirement_balance


def test_accumulation_increases_contribution_once_per_year() -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=42,
        initialBalance=0,
        monthlyContribution=100,
        annualReturnBeforeRetirement=0,
        annualContributionGrowthRate=0.10,
        retirementGoal=0,
    )

    result = calculate_accumulation(payload)

    assert result.total_contributions == 2_520
    assert result.retirement_balance == 2_520
    assert result.timeline[1].contributions == 1_200
    assert result.timeline[2].contributions == 2_520


def test_accumulation_goal_metrics_and_solver_are_consistent() -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=41,
        initialBalance=0,
        monthlyContribution=100,
        annualReturnBeforeRetirement=0,
        annualContributionGrowthRate=0,
        retirementGoal=1_200,
    )

    result = calculate_accumulation(payload)

    assert result.can_reach_goal is True
    assert result.retirement_balance == 1_200
    assert result.goal_gap == 0
    assert result.goal_funding_ratio == 1.0
    assert result.required_monthly_contribution == 100
    assert result.additional_monthly_contribution_needed == 0


def test_goal_solver_returns_absolute_required_contribution() -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=41,
        initialBalance=0,
        monthlyContribution=100,
        annualReturnBeforeRetirement=0,
        annualContributionGrowthRate=0,
        retirementGoal=2_400,
    )

    result = calculate_accumulation(payload)

    assert result.required_monthly_contribution == 200
    assert result.additional_monthly_contribution_needed == 100


def test_withdrawal_zero_return_depletes_on_the_scheduled_month() -> None:
    payload = make_payload(
        retirementAge=65,
        lifeExpectancy=70,
        retirementStartingBalance=10_000,
        initialBalance=10_000,
        withdrawalAmount=1_000,
        withdrawalFrequency="monthly",
        annualReturnDuringRetirement=0,
        inflationRate=0,
        annualWithdrawalIncrease=0,
    )

    result = calculate_withdrawal(payload)

    assert result.starting_balance == 10_000
    assert result.ending_balance == 0
    assert result.total_withdrawals == 10_000
    assert result.depletion_age == 65.83
    assert result.years_covered == 0.83
    assert result.sustainable_through_life_expectancy is False
    assert result.lasts_forever is False


@pytest.mark.parametrize(
    ("frequency", "expected_withdrawals"),
    [("monthly", 12), ("quarterly", 4), ("annual", 1)],
)
def test_withdrawal_frequency_controls_number_of_payments(
    frequency: str, expected_withdrawals: int
) -> None:
    payload = make_payload(
        retirementAge=65,
        lifeExpectancy=66,
        retirementStartingBalance=10_000,
        initialBalance=10_000,
        withdrawalAmount=100,
        withdrawalFrequency=frequency,
        annualReturnDuringRetirement=0,
        inflationRate=0,
        annualWithdrawalIncrease=0.01,
    )

    result = calculate_withdrawal(payload)

    assert result.total_withdrawals == expected_withdrawals * 100
    assert result.ending_balance == 10_000 - expected_withdrawals * 100
    assert result.depletion_age is None
    assert result.years_covered == 1


def test_withdrawal_applies_combined_inflation_and_annual_increase() -> None:
    payload = make_payload(
        retirementAge=65,
        lifeExpectancy=67,
        retirementStartingBalance=10_000,
        initialBalance=10_000,
        withdrawalAmount=100,
        withdrawalFrequency="monthly",
        annualReturnDuringRetirement=0,
        inflationRate=0.10,
        annualWithdrawalIncrease=0.10,
    )

    result = calculate_withdrawal(payload)

    assert yearly_withdrawal_bump(payload) == Decimal("0.21")
    assert result.total_withdrawals == 2_652
    assert result.ending_balance == 7_348


def test_withdrawal_caps_actual_payment_at_available_balance() -> None:
    payload = make_payload(
        retirementAge=65,
        lifeExpectancy=66,
        retirementStartingBalance=50,
        initialBalance=50,
        withdrawalAmount=100,
        annualReturnDuringRetirement=0,
        inflationRate=0,
        annualWithdrawalIncrease=0,
    )

    result = calculate_withdrawal(payload)

    assert result.total_withdrawals == 50
    assert result.ending_balance == 0
    assert result.depletion_age == 65.08


def test_zero_withdrawal_is_sustainable_and_preserves_growth() -> None:
    payload = make_payload(
        retirementAge=65,
        lifeExpectancy=90,
        retirementStartingBalance=1_000,
        initialBalance=1_000,
        withdrawalAmount=0,
        annualReturnDuringRetirement=0.12,
        compoundingFrequency="annual",
    )

    result = calculate_withdrawal(payload)

    assert result.depletion_age is None
    assert result.sustainable_through_life_expectancy is True
    assert result.lasts_forever is False
    assert result.total_withdrawals == 0
    assert result.ending_balance == round(1_000 * (1.12**25), 2)


def test_retirement_starting_balance_overrides_initial_balance() -> None:
    payload = make_payload(
        initialBalance=100,
        retirementStartingBalance=900,
        withdrawalAmount=100,
        annualReturnDuringRetirement=0,
        inflationRate=0,
        annualWithdrawalIncrease=0,
    )

    result = calculate_withdrawal(payload)

    assert result.starting_balance == 900


def test_journey_uses_accumulated_balance_and_has_one_retirement_start_point() -> None:
    payload = make_payload(
        currentAge=40,
        retirementAge=42,
        lifeExpectancy=60,
        initialBalance=1_000,
        monthlyContribution=100,
        annualReturnBeforeRetirement=0,
        annualReturnDuringRetirement=0,
        annualContributionGrowthRate=0,
        withdrawalAmount=1,
        inflationRate=0,
        annualWithdrawalIncrease=0,
        retirementGoal=0,
    )

    result = calculate_journey(payload)

    assert result.accumulation.retirement_balance == 3_400
    assert result.withdrawal.starting_balance == 3_400
    assert [point.age for point in result.timeline].count(42) == 1
    assert result.timeline[0].age == 40
    assert result.timeline[-1].age == 60
    assert result.shortfall_or_surplus >= 0


def test_planner_composes_the_same_three_views_as_direct_calculations() -> None:
    payload = make_payload()
    result = calculate_planner(payload)

    assert result.accumulation == calculate_accumulation(payload)
    assert result.standalone_withdrawal == calculate_withdrawal(payload)
    journey = calculate_journey(payload)
    assert result.journey == journey


@pytest.mark.parametrize(
    ("path", "expected_keys"),
    [
        ("/v1/calc/accumulation", {"retirementBalance", "timeline"}),
        ("/v1/calc/withdrawal", {"endingBalance", "timeline"}),
        ("/v1/calc/journey", {"accumulation", "withdrawal", "timeline"}),
        (
            "/v1/calc/planner",
            {"accumulation", "journey", "standaloneWithdrawal"},
        ),
    ],
)
def test_calculation_endpoints_return_successful_typed_results(
    path: str, expected_keys: set[str]
) -> None:
    response = client.post(path, json=make_payload().model_dump(by_alias=True))

    assert response.status_code == 200
    assert expected_keys <= response.json().keys()


@pytest.mark.parametrize(
    "invalid_input",
    [
        {"currentAge": 17},
        {"retirementAge": 39},
        {"lifeExpectancy": 65},
        {"initialBalance": -1},
        {"annualReturnBeforeRetirement": 0.21},
        {"compoundingFrequency": "weekly"},
        {"withdrawalFrequency": "weekly"},
    ],
)
def test_calculation_endpoint_rejects_invalid_input(
    invalid_input: dict[str, object],
) -> None:
    body = make_payload().model_dump(by_alias=True)
    body.update(invalid_input)

    response = client.post("/v1/calc/planner", json=body)

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("body_update", "message"),
    [
        ({"retirementAge": 40}, "Retirement age must be greater than current age."),
        (
            {"lifeExpectancy": 65},
            "Life expectancy should be later than retirement age.",
        ),
    ],
)
def test_calculation_endpoint_reports_age_order_validation(
    body_update: dict[str, object], message: str
) -> None:
    body = make_payload().model_dump(by_alias=True)
    body.update(body_update)

    response = client.post("/v1/calc/planner", json=body)

    assert response.status_code == 422
    assert message in response.text
