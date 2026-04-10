from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

CompoundingFrequency = Literal["monthly", "quarterly", "annual"]
WithdrawalFrequency = Literal["monthly", "quarterly", "annual"]


class PlannerModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class PlannerInput(PlannerModel):
    current_age: int = Field(alias="currentAge", ge=18, le=85)
    retirement_age: int = Field(alias="retirementAge", ge=40, le=85)
    life_expectancy: int = Field(alias="lifeExpectancy", ge=60, le=110)
    initial_balance: float = Field(alias="initialBalance", ge=0)
    retirement_starting_balance: float = Field(
        default=0, alias="retirementStartingBalance", ge=0
    )
    retirement_goal: float = Field(alias="retirementGoal", ge=100000, le=50000000)
    monthly_contribution: float = Field(alias="monthlyContribution", ge=0)
    annual_return_before_retirement: float = Field(
        alias="annualReturnBeforeRetirement", ge=0, le=0.2
    )
    annual_return_during_retirement: float = Field(
        alias="annualReturnDuringRetirement", ge=0, le=0.2
    )
    compounding_frequency: CompoundingFrequency = Field(alias="compoundingFrequency")
    annual_contribution_growth_rate: float = Field(
        alias="annualContributionGrowthRate", ge=0, le=0.1
    )
    withdrawal_amount: float = Field(alias="withdrawalAmount", ge=0)
    withdrawal_frequency: WithdrawalFrequency = Field(alias="withdrawalFrequency")
    inflation_rate: float = Field(alias="inflationRate", ge=0, le=0.1)
    annual_withdrawal_increase: float = Field(
        alias="annualWithdrawalIncrease", ge=0, le=0.1
    )

    @model_validator(mode="after")
    def validate_age_order(self) -> "PlannerInput":
        if self.retirement_age <= self.current_age:
            raise ValueError("Retirement age must be greater than current age.")
        if self.life_expectancy <= self.retirement_age:
            raise ValueError("Life expectancy should be later than retirement age.")
        return self


class TimelinePoint(PlannerModel):
    age: int
    balance: float
    contributions: float
    growth: float
    withdrawals: float


class AccumulationResult(PlannerModel):
    additional_monthly_contribution_needed: float = Field(
        alias="additionalMonthlyContributionNeeded"
    )
    can_reach_goal: bool = Field(alias="canReachGoal")
    goal_funding_ratio: float = Field(alias="goalFundingRatio")
    goal_gap: float = Field(alias="goalGap")
    monthly_income_estimate: float = Field(alias="monthlyIncomeEstimate")
    required_monthly_contribution: float = Field(alias="requiredMonthlyContribution")
    retirement_balance: float = Field(alias="retirementBalance")
    timeline: list[TimelinePoint]
    total_contributions: float = Field(alias="totalContributions")
    total_growth: float = Field(alias="totalGrowth")
    years_to_retirement: int = Field(alias="yearsToRetirement")


class WithdrawalResult(PlannerModel):
    depletion_age: float | None = Field(alias="depletionAge")
    ending_balance: float = Field(alias="endingBalance")
    starting_balance: float = Field(alias="startingBalance")
    sustainable_through_life_expectancy: bool = Field(
        alias="sustainableThroughLifeExpectancy"
    )
    timeline: list[TimelinePoint]
    total_withdrawals: float = Field(alias="totalWithdrawals")
    years_covered: float = Field(alias="yearsCovered")


class JourneyResult(PlannerModel):
    accumulation: AccumulationResult
    shortfall_or_surplus: float = Field(alias="shortfallOrSurplus")
    timeline: list[TimelinePoint]
    withdrawal: WithdrawalResult


class HealthResponse(PlannerModel):
    status: str
