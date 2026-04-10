import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.domain.retirement import calculate_journey
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
