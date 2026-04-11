import json
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient

from app.domain.retirement import calculate_journey, calculate_withdrawal
from app.main import app
from app.schemas.planner import PlannerInput

client = TestClient(app)


def load_fixture() -> dict:
    fixture_path = Path(__file__).resolve().parents[3] / "fixtures" / "retirement-scenarios.json"
    scenarios = json.loads(fixture_path.read_text())
    return scenarios[0]


def test_domain_journey_grows_before_retirement() -> None:
    scenario = load_fixture()
    payload = PlannerInput.model_validate(scenario["input"])

    result = calculate_journey(payload)

    assert result.accumulation.retirement_balance > payload.initial_balance
    assert result.accumulation.required_monthly_contribution >= payload.monthly_contribution
    assert result.accumulation.goal_funding_ratio > 0
    assert result.withdrawal.starting_balance == result.accumulation.retirement_balance
    assert len(result.timeline) > len(result.accumulation.timeline)


def test_journey_endpoint_returns_expected_shape() -> None:
    scenario = load_fixture()

    response = client.post("/v1/calc/journey", json=scenario["input"])

    assert response.status_code == 200

    data = response.json()
    assert "accumulation" in data
    assert "withdrawal" in data
    assert "shortfallOrSurplus" in data
    assert "goalGap" in data["accumulation"]
    assert "requiredMonthlyContribution" in data["accumulation"]


def test_withdrawal_uses_retirement_starting_balance_override() -> None:
    scenario = load_fixture()
    scenario["input"]["retirementStartingBalance"] = 900000

    payload = PlannerInput.model_validate(scenario["input"])
    result = calculate_withdrawal(payload)

    assert result.starting_balance == 900000


def test_depleted_withdrawal_ends_at_zero_but_journey_keeps_shortfall_signal() -> None:
    payload = PlannerInput.model_validate(
        {
            "currentAge": 64,
            "retirementAge": 65,
            "lifeExpectancy": 92,
            "initialBalance": 10000,
            "retirementStartingBalance": 0,
            "retirementGoal": 100000,
            "monthlyContribution": 0,
            "annualReturnBeforeRetirement": 0,
            "annualReturnDuringRetirement": 0,
            "compoundingFrequency": "monthly",
            "annualContributionGrowthRate": 0,
            "withdrawalAmount": 8000,
            "withdrawalFrequency": "monthly",
            "inflationRate": 0,
            "annualWithdrawalIncrease": 0,
        }
    )

    withdrawal = calculate_withdrawal(payload, starting_balance=Decimal("10000"))
    journey = calculate_journey(payload)

    assert withdrawal.ending_balance == 0
    assert journey.withdrawal.ending_balance == 0
    assert journey.shortfall_or_surplus < 0


def test_planner_endpoint_returns_all_views() -> None:
    scenario = load_fixture()
    scenario["input"]["retirementStartingBalance"] = 750000

    response = client.post("/v1/calc/planner", json=scenario["input"])

    assert response.status_code == 200

    data = response.json()
    assert "accumulation" in data
    assert "journey" in data
    assert "standaloneWithdrawal" in data
    assert data["standaloneWithdrawal"]["startingBalance"] == 750000
    assert (
        data["journey"]["withdrawal"]["startingBalance"]
        == data["accumulation"]["retirementBalance"]
    )
