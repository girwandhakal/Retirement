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
      getSummaryValue(baseInput, "withdraw", "Ending balance"),
    ).not.toBe(
      getSummaryValue(updatedInput, "withdraw", "Ending balance"),
    );
    expect(
      getSummaryValue(baseInput, "journey", "Surplus or shortfall"),
    ).not.toBe(
      getSummaryValue(updatedInput, "journey", "Surplus or shortfall"),
    );
    expect(
      getSummaryValue(baseInput, "journey", "Income target"),
    ).not.toBe(
      getSummaryValue(updatedInput, "journey", "Income target"),
    );
  });
});
