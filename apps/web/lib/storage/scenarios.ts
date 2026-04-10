import { coercePlannerInput } from "@/lib/planner";
import { plannerInputSchema, type PlannerInput } from "@/lib/types";

export type StoredScenario = {
  createdAt: string;
  id: string;
  input: PlannerInput;
  name: string;
  updatedAt: string;
};

const SCENARIO_STORAGE_KEY = "retirement-planner:scenarios";
const DRAFT_STORAGE_KEY = "retirement-planner:draft";

function hasWindow() {
  return typeof window !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scenario-${Date.now()}`;
}

function sortScenarios(entries: StoredScenario[]) {
  return [...entries].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function parseStoredScenario(raw: unknown): StoredScenario | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<StoredScenario> & {
    input?: unknown;
    label?: string;
  };

  const parsedInput = plannerInputSchema.safeParse(
    coercePlannerInput((candidate.input ?? raw) as Partial<PlannerInput>),
  );

  if (!parsedInput.success) {
    return null;
  }

  return {
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    id: typeof candidate.id === "string" ? candidate.id : createId(),
    input: parsedInput.data,
    name:
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.label === "string"
          ? candidate.label
          : "Imported scenario",
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function writeScenarios(entries: StoredScenario[]) {
  if (!hasWindow()) {
    return entries;
  }

  const sorted = sortScenarios(entries);
  window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
}

export function createScenarioSnapshot(
  name: string,
  input: PlannerInput,
): StoredScenario {
  const timestamp = new Date().toISOString();

  return {
    createdAt: timestamp,
    id: createId(),
    input,
    name,
    updatedAt: timestamp,
  };
}

export function listStoredScenarios() {
  if (!hasWindow()) {
    return [] as StoredScenario[];
  }

  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortScenarios(
      parsed
        .map((entry) => parseStoredScenario(entry))
        .filter((entry): entry is StoredScenario => entry !== null),
    );
  } catch {
    return [];
  }
}

export function saveStoredScenario(name: string, input: PlannerInput) {
  const nextScenario = createScenarioSnapshot(name, input);
  const existing = listStoredScenarios();

  return {
    saved: nextScenario,
    scenarios: writeScenarios([nextScenario, ...existing]),
  };
}

export function deleteStoredScenario(id: string) {
  const next = listStoredScenarios().filter((scenario) => scenario.id !== id);
  return writeScenarios(next);
}

export function exportScenarioJson(scenario: StoredScenario) {
  return JSON.stringify(
    {
      version: 1,
      ...scenario,
    },
    null,
    2,
  );
}

export function importScenarioJson(serialized: string) {
  const parsed = parseStoredScenario(JSON.parse(serialized));

  if (!parsed) {
    throw new Error("The imported file does not contain a valid planner scenario.");
  }

  const next = {
    ...parsed,
    id: createId(),
    updatedAt: new Date().toISOString(),
  };

  return {
    imported: next,
    scenarios: writeScenarios([next, ...listStoredScenarios()]),
  };
}

export function saveDraftScenario(input: PlannerInput) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(input));
}

export function loadDraftScenario() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = plannerInputSchema.safeParse(
      coercePlannerInput(JSON.parse(raw) as Partial<PlannerInput>),
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
