import {
  deleteStoredScenario,
  exportScenarioJson,
  importScenarioJson,
  listStoredScenarios,
  loadDraftScenario,
  saveDraftScenario,
  saveStoredScenario,
} from "@/lib/storage/scenarios";
import { defaultPlannerInput } from "@/lib/types";

describe("scenario storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and lists scenarios in browser storage", () => {
    const { saved } = saveStoredScenario("Base plan", defaultPlannerInput);
    const scenarios = listStoredScenarios();

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.id).toBe(saved.id);
    expect(scenarios[0]?.name).toBe("Base plan");
  });

  it("exports and re-imports a scenario", () => {
    const { saved } = saveStoredScenario("Portable plan", defaultPlannerInput);
    const exported = exportScenarioJson(saved);
    window.localStorage.clear();

    const { imported, scenarios } = importScenarioJson(exported);

    expect(imported.name).toBe("Portable plan");
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.input.retirementGoal).toBe(
      defaultPlannerInput.retirementGoal,
    );
  });

  it("removes scenarios and preserves draft state separately", () => {
    const { saved } = saveStoredScenario("Delete me", defaultPlannerInput);
    saveDraftScenario({
      ...defaultPlannerInput,
      monthlyContribution: 1500,
    });

    const remaining = deleteStoredScenario(saved.id);
    const draft = loadDraftScenario();

    expect(remaining).toHaveLength(0);
    expect(draft?.monthlyContribution).toBe(1500);
  });
});
