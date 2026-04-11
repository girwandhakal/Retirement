import type { PlannerInput, PlannerResultSet } from "@/lib/types";

export async function fetchPlannerResultSet(
  input: PlannerInput,
  signal?: AbortSignal,
): Promise<PlannerResultSet> {
  const response = await fetch("/api/planner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Planner API request failed with status ${response.status}.`);
  }

  return (await response.json()) as PlannerResultSet;
}
