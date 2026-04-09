import {
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
});

