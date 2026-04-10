import {
  buildComparisonData,
  buildOpportunityInsights,
  calculateAccumulation,
  calculateJourney,
  calculateWithdrawal,
} from "@/lib/planner";
import { defaultPlannerInput } from "@/lib/types";

describe("planner calculations", () => {
  it("grows the portfolio before retirement", () => {
    const result = calculateAccumulation(defaultPlannerInput);

    expect(result.retirementBalance).toBeGreaterThan(
      defaultPlannerInput.initialBalance,
    );
    expect(result.totalGrowth).toBeGreaterThan(0);
    expect(result.requiredMonthlyContribution).toBeGreaterThan(0);
  });

  it("keeps journey and withdrawal timelines available", () => {
    const journey = calculateJourney(defaultPlannerInput);
    const withdrawal = calculateWithdrawal(
      defaultPlannerInput,
      journey.accumulation.retirementBalance,
    );

    expect(journey.timeline.length).toBeGreaterThan(
      journey.accumulation.timeline.length,
    );
    expect(withdrawal.timeline.length).toBeGreaterThan(1);
  });

  it("solves a higher monthly contribution when the goal is underfunded", () => {
    const result = calculateAccumulation({
      ...defaultPlannerInput,
      monthlyContribution: 200,
      retirementGoal: 2_500_000,
    });

    expect(result.canReachGoal).toBe(true);
    expect(result.requiredMonthlyContribution).toBeGreaterThan(200);
    expect(result.additionalMonthlyContributionNeeded).toBeGreaterThan(0);
    expect(result.goalGap).toBeLessThan(0);
  });

  it("builds comparison data with aligned ages across scenarios", () => {
    const baseJourney = calculateJourney(defaultPlannerInput);
    const shorterJourney = calculateJourney({
      ...defaultPlannerInput,
      retirementAge: 60,
      lifeExpectancy: 88,
    });

    const comparison = buildComparisonData([
      {
        color: "#5ac8fa",
        label: "Base",
        timeline: baseJourney.timeline,
      },
      {
        color: "#ffd69a",
        label: "Shorter",
        timeline: shorterJourney.timeline,
      },
    ]);

    expect(comparison.xValues[0]).toBe(defaultPlannerInput.currentAge);
    expect(comparison.series).toHaveLength(2);
    expect(comparison.series[0]?.values).toHaveLength(comparison.xValues.length);
    expect(comparison.series[1]?.values).toContain(null);
  });

  it("returns sorted opportunity insights", () => {
    const opportunities = buildOpportunityInsights(defaultPlannerInput);

    expect(opportunities).toHaveLength(4);
    expect(opportunities[0]!.deltaEndingBalance).toBeGreaterThanOrEqual(
      opportunities[1]!.deltaEndingBalance,
    );
  });
});
