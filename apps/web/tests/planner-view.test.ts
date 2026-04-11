import { calculatePlannerResultSet } from "@/lib/planner";
import { buildPlannerView } from "@/lib/planner-view";
import { defaultPlannerInput, type PlannerMode, type PlannerInput } from "@/lib/types";

function getSummaryValue(
  input: PlannerInput,
  activeTab: PlannerMode,
  label: string,
) {
  const result = calculatePlannerResultSet(input);
  const view = buildPlannerView({
    activeTab,
    accumulation: result.accumulation,
    input,
    journey: result.journey,
  });

  const item = view.summary.find((entry) => entry.label === label);

  if (!item) {
    throw new Error(`Could not find summary item "${label}" on ${activeTab}.`);
  }

  return item.value;
}

describe("planner view summary connections", () => {
  it("updates accumulation-driven tiles when pre-retirement inputs change", () => {
    const updatedInput = {
      ...defaultPlannerInput,
      monthlyContribution: defaultPlannerInput.monthlyContribution + 1500,
    };

    expect(
      getSummaryValue(defaultPlannerInput, "save", "Projected at retirement"),
    ).not.toBe(
      getSummaryValue(updatedInput, "save", "Projected at retirement"),
    );
    expect(
      getSummaryValue(defaultPlannerInput, "save", "4% monthly income guide"),
    ).not.toBe(
      getSummaryValue(updatedInput, "save", "4% monthly income guide"),
    );
    expect(
      getSummaryValue(defaultPlannerInput, "withdraw", "Amount at retirement"),
    ).not.toBe(
      getSummaryValue(updatedInput, "withdraw", "Amount at retirement"),
    );
    expect(
      getSummaryValue(defaultPlannerInput, "journey", "Balance at retirement"),
    ).not.toBe(
      getSummaryValue(updatedInput, "journey", "Balance at retirement"),
    );
  });

  it("updates goal-driven tiles when the retirement goal changes", () => {
    const baseInput = {
      ...defaultPlannerInput,
      monthlyContribution: 200,
      retirementGoal: 2500000,
    };
    const updatedInput = {
      ...baseInput,
      retirementGoal: baseInput.retirementGoal + 750000,
    };

    expect(
      getSummaryValue(baseInput, "save", "Retirement goal gap"),
    ).not.toBe(
      getSummaryValue(updatedInput, "save", "Retirement goal gap"),
    );
    expect(
      getSummaryValue(baseInput, "save", "Monthly contribution needed"),
    ).not.toBe(
      getSummaryValue(updatedInput, "save", "Monthly contribution needed"),
    );
    expect(
      getSummaryValue(baseInput, "journey", "Goal funding ratio"),
    ).not.toBe(
      getSummaryValue(updatedInput, "journey", "Goal funding ratio"),
    );
  });

  it("shows N/A for goal-driven tiles when no retirement goal is set", () => {
    const noGoalInput = {
      ...defaultPlannerInput,
      retirementGoal: 0,
    };

    expect(
      getSummaryValue(noGoalInput, "save", "Retirement goal gap"),
    ).toBe("N/A");
    expect(
      getSummaryValue(noGoalInput, "save", "Monthly contribution needed"),
    ).toBe("N/A");
    expect(
      getSummaryValue(noGoalInput, "journey", "Goal funding ratio"),
    ).toBe("N/A");
  });

  it("calculates required monthly contribution independently of the current contribution input", () => {
    const lowContributionInput = {
      ...defaultPlannerInput,
      monthlyContribution: 100,
      retirementGoal: 2500000,
    };
    const highContributionInput = {
      ...lowContributionInput,
      monthlyContribution: 900,
    };

    expect(
      getSummaryValue(lowContributionInput, "save", "Monthly contribution needed"),
    ).toBe(
      getSummaryValue(highContributionInput, "save", "Monthly contribution needed"),
    );
  });

  it("updates post-retirement tiles when withdrawal inputs change", () => {
    const baseInput = {
      ...defaultPlannerInput,
      currentAge: 64,
      retirementAge: 65,
      lifeExpectancy: 92,
      initialBalance: 50000,
      monthlyContribution: 0,
      annualReturnBeforeRetirement: 0,
      annualReturnDuringRetirement: 0,
      annualContributionGrowthRate: 0,
      inflationRate: 0,
      annualWithdrawalIncrease: 0,
      withdrawalAmount: 100,
    };
    const updatedInput = {
      ...baseInput,
      withdrawalAmount: 3000,
    };
    const updatedIncomeTargetInput = {
      ...baseInput,
      inflationRate: 0.04,
    };

    expect(
      getSummaryValue(baseInput, "withdraw", "Years covered"),
    ).not.toBe(
      getSummaryValue(updatedInput, "withdraw", "Years covered"),
    );
    expect(
      getSummaryValue(baseInput, "withdraw", "Depletion age"),
    ).not.toBe(
      getSummaryValue(updatedInput, "withdraw", "Depletion age"),
    );
    expect(
      getSummaryValue(baseInput, "journey", "Surplus or shortfall"),
    ).not.toBe(
      getSummaryValue(updatedInput, "journey", "Surplus or shortfall"),
    );
    expect(
      getSummaryValue(baseInput, "journey", "Max monthly withdrawal"),
    ).not.toBe(
      getSummaryValue(updatedIncomeTargetInput, "journey", "Max monthly withdrawal"),
    );
  });

  it("shows forever when the current withdrawal path never depletes the portfolio", () => {
    const foreverInput = {
      ...defaultPlannerInput,
      currentAge: 64,
      retirementAge: 65,
      lifeExpectancy: 92,
      initialBalance: 2_000_000,
      monthlyContribution: 0,
      annualReturnBeforeRetirement: 0,
      annualReturnDuringRetirement: 0.07,
      annualContributionGrowthRate: 0,
      withdrawalAmount: 2000,
      withdrawalFrequency: "monthly" as const,
      inflationRate: 0.01,
      annualWithdrawalIncrease: 0,
    };

    expect(
      getSummaryValue(foreverInput, "withdraw", "Years covered"),
    ).toBe("Forever");
  });

  it("updates max monthly withdrawal when the current portfolio balance changes", () => {
    const lowerBalanceInput = {
      ...defaultPlannerInput,
      initialBalance: 50_000,
    };
    const higherBalanceInput = {
      ...lowerBalanceInput,
      initialBalance: 250_000,
    };

    expect(
      getSummaryValue(lowerBalanceInput, "journey", "Max monthly withdrawal"),
    ).not.toBe(
      getSummaryValue(higherBalanceInput, "journey", "Max monthly withdrawal"),
    );
  });

  it("returns a max monthly withdrawal that depletes the portfolio at the end of the journey", () => {
    const baseInput = {
      ...defaultPlannerInput,
      withdrawalFrequency: "monthly" as const,
    };
    const result = calculatePlannerResultSet(baseInput);
    const replayed = calculatePlannerResultSet({
      ...baseInput,
      withdrawalAmount: result.journey.maxSustainableMonthlyWithdrawal,
    });

    expect(Math.abs(replayed.journey.shortfallOrSurplus)).toBeLessThanOrEqual(5);
  });
});
