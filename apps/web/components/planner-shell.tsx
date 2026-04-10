"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";

import { FieldHint } from "@/components/field-hint";
import { PlannerChart } from "@/components/planner-chart";
import { SummaryCard } from "@/components/summary-card";
import { formatCurrency, formatPercent, formatYears } from "@/lib/format";
import {
  buildComparisonData,
  buildOpportunityInsights,
  calculateAccumulation,
  calculateJourney,
  calculateWithdrawal,
  coercePlannerInput,
} from "@/lib/planner";
import { scenarioPresets } from "@/lib/presets";
import {
  createScenarioSnapshot,
  deleteStoredScenario,
  exportScenarioJson,
  importScenarioJson,
  listStoredScenarios,
  loadDraftScenario,
  saveDraftScenario,
  saveStoredScenario,
  type StoredScenario,
} from "@/lib/storage/scenarios";
import {
  defaultPlannerInput,
  type PlannerInput,
  type PlannerMode,
  plannerInputSchema,
} from "@/lib/types";

type NumberFieldName =
  | "currentAge"
  | "retirementAge"
  | "lifeExpectancy"
  | "initialBalance"
  | "retirementStartingBalance"
  | "retirementGoal"
  | "monthlyContribution"
  | "annualReturnBeforeRetirement"
  | "annualReturnDuringRetirement"
  | "annualContributionGrowthRate"
  | "withdrawalAmount"
  | "inflationRate"
  | "annualWithdrawalIncrease";

const comparisonPalette = ["#5ac8fa", "#d7f58c", "#ffd69a", "#ffc6d0"];

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createScenarioFileName(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "retirement-scenario"}.json`;
}

function downloadJsonFile(name: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = createScenarioFileName(name);
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function PlannerShell() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<PlannerMode>("journey");
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string>("Not saved yet");
  const [savedScenarios, setSavedScenarios] = useState<StoredScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("My retirement plan");
  const [storageMessage, setStorageMessage] = useState(
    "Scenarios stay on this device. Nothing needs an account or cloud sync.",
  );
  const [storageReady, setStorageReady] = useState(false);

  const form = useForm<PlannerInput>({
    resolver: zodResolver(plannerInputSchema),
    mode: "onChange",
    defaultValues: defaultPlannerInput,
  });

  const watchedValues = form.watch();
  const deferredValues = useDeferredValue(watchedValues);
  const input = coercePlannerInput(deferredValues);

  const accumulation = calculateAccumulation(input);
  const standaloneWithdrawal = calculateWithdrawal(input);
  const journey = calculateJourney(input);
  const opportunityInsights = buildOpportunityInsights(input);

  useEffect(() => {
    const storedDraft = loadDraftScenario();
    const storedScenarios = listStoredScenarios();

    setSavedScenarios(storedScenarios);
    setCompareSelection(storedScenarios.slice(0, 2).map((scenario) => scenario.id));

    if (storedScenarios[0]) {
      setLastSavedAt(formatTimestamp(storedScenarios[0].updatedAt));
    }

    if (storedDraft) {
      form.reset(storedDraft);
      setScenarioName("Recovered draft");
      setStorageMessage(
        "Recovered the last in-progress scenario from browser storage.",
      );
    }

    setStorageReady(true);
  }, [form]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveDraftScenario(input);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [input, storageReady]);

  const retirementGoalCopy =
    accumulation.goalGap >= 0
      ? `You're ahead of your retirement target by ${formatCurrency(accumulation.goalGap)}.`
      : `You're currently short of your target by ${formatCurrency(Math.abs(accumulation.goalGap))}.`;

  const journeyCopy = journey.withdrawal.sustainableThroughLifeExpectancy
    ? `Under these fixed assumptions, the plan reaches age ${input.lifeExpectancy} with money still left over.`
    : `Under these fixed assumptions, the portfolio runs out around age ${journey.withdrawal.depletionAge?.toFixed(1)}.`;

  const mostHelpfulChange = opportunityInsights[0];

  const comparisonEntries = [
    {
      color: comparisonPalette[0],
      label: `${scenarioName.trim() || "Current scenario"} (Current)`,
      timeline: journey.timeline,
    },
    ...compareSelection
      .map((selectedId, index) => {
        const scenario = savedScenarios.find((entry) => entry.id === selectedId);

        if (!scenario) {
          return null;
        }

        return {
          color: comparisonPalette[(index + 1) % comparisonPalette.length],
          label: scenario.name,
          timeline: calculateJourney(scenario.input).timeline,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  ];

  const comparisonChart = buildComparisonData(comparisonEntries);

  const view =
    activeTab === "save"
      ? {
          title: "Save for retirement",
          subtitle:
            "See how today's balance, monthly savings, and return assumptions stack up against your target.",
          chartTitle: "Portfolio growth vs. principal",
          chartSubtitle:
            "The planner keeps the calculation local so every edit updates instantly without an API call.",
          chartX: accumulation.timeline.map((point) => point.age),
          chartSeries: [
            {
              label: "Projected balance",
              color: "#aefcff",
              values: accumulation.timeline.map((point) => point.balance),
            },
            {
              label: "Principal invested",
              color: "#d7f58c",
              values: accumulation.timeline.map((point) => point.contributions),
            },
          ],
          summary: [
            {
              label: "Projected at retirement",
              value: formatCurrency(accumulation.retirementBalance),
              caption: "Estimated portfolio value at the planned retirement age.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("sky" as const),
            },
            {
              label: "Retirement goal gap",
              value:
                accumulation.goalGap >= 0
                  ? formatCurrency(accumulation.goalGap)
                  : `-${formatCurrency(Math.abs(accumulation.goalGap))}`,
              caption: "Positive means the current plan clears the target. Negative means more savings are needed.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("rose" as const),
            },
            {
              label: "Monthly contribution needed",
              value: formatCurrency(accumulation.requiredMonthlyContribution),
              caption: accumulation.canReachGoal
                ? "The monthly saving level needed to hit the retirement target under the current assumptions."
                : "The solver did not find a realistic monthly saving level within the current bounds.",
              accent: "gold" as const,
            },
            {
              label: "4% monthly income guide",
              value: formatCurrency(accumulation.monthlyIncomeEstimate),
              caption: "A rough rule-of-thumb estimate, not a guaranteed withdrawal recommendation.",
              accent: "sky" as const,
            },
          ],
          rows: accumulation.timeline.slice(-8),
        }
      : activeTab === "withdraw"
        ? {
            title: "Withdraw in retirement",
            subtitle:
              "Model how long the portfolio may last once contributions stop and withdrawals begin.",
            chartTitle: "Retirement drawdown",
            chartSubtitle:
              "This view uses the retirement override when set, otherwise it starts from the current portfolio balance.",
            chartX: standaloneWithdrawal.timeline.map((point) => point.age),
            chartSeries: [
              {
                label: "Remaining balance",
                color: "#ffd69a",
                values: standaloneWithdrawal.timeline.map((point) => point.balance),
              },
              {
                label: "Withdrawals taken",
                color: "#ffc6d0",
                values: standaloneWithdrawal.timeline.map(
                  (point) => point.withdrawals,
                ),
              },
            ],
            summary: [
              {
                label: "Starting retirement balance",
                value: formatCurrency(standaloneWithdrawal.startingBalance),
                caption: "If the retirement override is zero, the planner uses today's balance for this standalone check.",
                accent: "sky" as const,
              },
              {
                label: "Years covered",
                value: formatYears(standaloneWithdrawal.yearsCovered),
                caption: "How long the portfolio lasts before the balance first turns negative.",
                accent: standaloneWithdrawal.sustainableThroughLifeExpectancy
                  ? ("lime" as const)
                  : ("gold" as const),
              },
              {
                label: "Depletion age",
                value:
                  standaloneWithdrawal.depletionAge === null
                    ? "Not depleted"
                    : standaloneWithdrawal.depletionAge.toFixed(1),
                caption: "The first modeled age when the retirement balance falls below zero.",
                accent:
                  standaloneWithdrawal.depletionAge === null
                    ? ("lime" as const)
                    : ("rose" as const),
              },
              {
                label: "Ending balance",
                value: formatCurrency(standaloneWithdrawal.endingBalance),
                caption: "Balance remaining at the life expectancy target horizon.",
                accent:
                  standaloneWithdrawal.endingBalance >= 0
                    ? ("lime" as const)
                    : ("rose" as const),
              },
            ],
            rows: standaloneWithdrawal.timeline.slice(-8),
          }
        : {
            title: "Full retirement journey",
            subtitle:
              "Connect the saving years and the spending years in one timeline so the tradeoffs are visible in one place.",
            chartTitle: "Start-to-finish balance path",
            chartSubtitle:
              "The journey mode hands the projected retirement balance directly into the withdrawal model for a full deterministic scenario.",
            chartX: journey.timeline.map((point) => point.age),
            chartSeries: [
              {
                label: "Portfolio balance",
                color: "#5ac8fa",
                values: journey.timeline.map((point) => point.balance),
              },
            ],
            summary: [
              {
                label: "Balance at retirement",
                value: formatCurrency(journey.accumulation.retirementBalance),
                caption: "Projected hand-off from the saving phase into the withdrawal phase.",
                accent: "sky" as const,
              },
              {
                label: "Surplus or shortfall",
                value: formatCurrency(journey.shortfallOrSurplus),
                caption: "Positive means money remains at the life expectancy target. Negative means the plan runs out early.",
                accent: journey.shortfallOrSurplus >= 0 ? ("lime" as const) : ("rose" as const),
              },
              {
                label: "Goal funding ratio",
                value: formatPercent(accumulation.goalFundingRatio),
                caption: "How much of the retirement target the current saving plan is projected to fund.",
                accent: accumulation.goalFundingRatio >= 1 ? ("lime" as const) : ("gold" as const),
              },
              {
                label: "Income target",
                value: formatCurrency(input.withdrawalAmount),
                caption: `Modeled as a ${input.withdrawalFrequency} retirement withdrawal.`,
                accent: "gold" as const,
              },
            ],
            rows: journey.timeline.slice(-8),
          };

  function resetPlanner() {
    startTransition(() => {
      form.reset(defaultPlannerInput);
      setScenarioName("My retirement plan");
      setStorageMessage(
        "Reset to the default assumptions. Local draft saving stays active.",
      );
    });
  }

  function applyPreset(preset: PlannerInput, label: string) {
    startTransition(() => {
      form.reset(preset);
      setScenarioName(label);
      setStorageMessage(`Loaded the ${label} preset.`);
    });
  }

  function saveCurrentScenario() {
    const resolvedName = scenarioName.trim() || `Scenario ${savedScenarios.length + 1}`;
    const { saved, scenarios } = saveStoredScenario(resolvedName, input);

    setSavedScenarios(scenarios);
    setScenarioName(resolvedName);
    setLastSavedAt(formatTimestamp(saved.updatedAt));
    setStorageMessage(`Saved "${resolvedName}" to this browser.`);
    setCompareSelection((current) =>
      current.includes(saved.id) ? current : [saved.id, ...current].slice(0, 3),
    );
  }

  function loadScenario(scenario: StoredScenario) {
    startTransition(() => {
      form.reset(scenario.input);
      setScenarioName(scenario.name);
      setStorageMessage(`Loaded "${scenario.name}" from browser storage.`);
    });
  }

  function removeScenario(id: string) {
    const next = deleteStoredScenario(id);

    setSavedScenarios(next);
    setCompareSelection((current) => current.filter((entry) => entry !== id));
    setStorageMessage("Removed the saved scenario from this browser.");

    if (next[0]) {
      setLastSavedAt(formatTimestamp(next[0].updatedAt));
    } else {
      setLastSavedAt("Not saved yet");
    }
  }

  function toggleComparison(id: string) {
    setCompareSelection((current) => {
      if (current.includes(id)) {
        return current.filter((entry) => entry !== id);
      }

      return [...current, id].slice(-3);
    });
  }

  function exportCurrentScenario() {
    const snapshot = createScenarioSnapshot(
      scenarioName.trim() || "Current scenario",
      input,
    );

    downloadJsonFile(snapshot.name, exportScenarioJson(snapshot));
    setStorageMessage(
      `Exported "${snapshot.name}" as JSON. You can re-import it on this device later.`,
    );
  }

  function exportSavedScenario(scenario: StoredScenario) {
    downloadJsonFile(scenario.name, exportScenarioJson(scenario));
    setStorageMessage(`Exported "${scenario.name}" as JSON.`);
  }

  async function handleScenarioImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const { imported, scenarios } = importScenarioJson(text);

      startTransition(() => {
        form.reset(imported.input);
        setScenarioName(imported.name);
        setSavedScenarios(scenarios);
        setLastSavedAt(formatTimestamp(imported.updatedAt));
        setCompareSelection((current) =>
          [imported.id, ...current.filter((entry) => entry !== imported.id)].slice(
            0,
            3,
          ),
        );
        setStorageMessage(`Imported "${imported.name}" into browser storage.`);
      });
    } catch (error) {
      setStorageMessage(
        error instanceof Error
          ? error.message
          : "Could not import that scenario file.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function NumberField(props: {
    hint: string;
    label: string;
    name: NumberFieldName;
    step?: string;
  }) {
    const error = form.formState.errors[props.name];

    return (
      <label className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/86">{props.label}</span>
          <FieldHint>{props.hint}</FieldHint>
        </div>
        <input
          type="number"
          step={props.step ?? "1"}
          {...form.register(props.name, { valueAsNumber: true })}
          className="w-full rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400/70 focus:border-cyan-200/40"
        />
        {error ? <p className="text-xs text-rose-200">{error.message}</p> : null}
      </label>
    );
  }

  function SelectField(props: {
    hint: string;
    label: string;
    name: "compoundingFrequency" | "withdrawalFrequency";
    options: Array<{ label: string; value: string }>;
  }) {
    const error = form.formState.errors[props.name];

    return (
      <label className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/86">{props.label}</span>
          <FieldHint>{props.hint}</FieldHint>
        </div>
        <select
          {...form.register(props.name)}
          className="w-full rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/40"
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value} className="bg-ink-950">
              {option.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-rose-200">{error.message}</p> : null}
      </label>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel rounded-[2rem] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl text-white">Scenario inputs</p>
              <p className="mt-2 text-sm leading-6 text-slate-200/72">
                Tune the assumptions, save scenarios locally, and compare plans
                without waiting on the backend.
              </p>
            </div>
            <button
              type="button"
              onClick={resetPlanner}
              className="rounded-full border border-white/14 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-100/72 transition hover:bg-white/8"
            >
              Reset
            </button>
          </div>

          <label className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-white/86">
                Scenario name
              </span>
              <FieldHint>Used when saving to browser storage or exporting JSON.</FieldHint>
            </div>
            <input
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/40"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {scenarioPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.input, preset.label)}
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-100/82 transition hover:bg-white/16"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PlannerMode)}
          className="mt-5"
        >
          <Tabs.List className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/10 bg-black/16 p-2">
            <Tabs.Trigger
              value="save"
              className="rounded-[1rem] px-4 py-3 text-sm text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white"
            >
              Save
            </Tabs.Trigger>
            <Tabs.Trigger
              value="withdraw"
              className="rounded-[1rem] px-4 py-3 text-sm text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white"
            >
              Withdraw
            </Tabs.Trigger>
            <Tabs.Trigger
              value="journey"
              className="rounded-[1rem] px-4 py-3 text-sm text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white"
            >
              Journey
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value={activeTab} className="mt-5 space-y-6">
            <section className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-200/58">
                  Essential inputs
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  name="currentAge"
                  label="Current age"
                  hint="Used to determine how long contributions can compound."
                />
                <NumberField
                  name="retirementAge"
                  label="Retirement age"
                  hint="The age when the planner switches from saving to spending."
                />
                <NumberField
                  name="lifeExpectancy"
                  label="Life expectancy target"
                  hint="The end horizon for the sustainability check."
                />
                <NumberField
                  name="retirementGoal"
                  label="Retirement goal ($)"
                  hint="A target portfolio value at retirement for measuring readiness."
                />
                <NumberField
                  name="initialBalance"
                  label="Current portfolio balance ($)"
                  hint="Starting investment balance before new contributions."
                />
                <NumberField
                  name="monthlyContribution"
                  label="Monthly contribution ($)"
                  hint="Amount invested every month before retirement."
                />
                <NumberField
                  name="withdrawalAmount"
                  label="Withdrawal amount ($)"
                  hint="Spending target in retirement, applied at the frequency chosen below."
                />
                <NumberField
                  name="retirementStartingBalance"
                  label="Retirement override balance ($)"
                  hint="Optional. Leave at 0 to use the modeled balance at retirement."
                />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-200/58">
                  Assumptions
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  name="annualReturnBeforeRetirement"
                  label="Annual return before retirement"
                  hint="Expected long-run portfolio growth during the saving years."
                  step="0.001"
                />
                <NumberField
                  name="annualReturnDuringRetirement"
                  label="Annual return during retirement"
                  hint="Expected growth after withdrawals begin."
                  step="0.001"
                />
                <NumberField
                  name="annualContributionGrowthRate"
                  label="Annual contribution growth"
                  hint="Use this to model raises or planned savings increases over time."
                  step="0.001"
                />
                <SelectField
                  name="compoundingFrequency"
                  label="Compounding frequency"
                  hint="How often the planner applies the pre-retirement return assumption."
                  options={[
                    { label: "Monthly", value: "monthly" },
                    { label: "Quarterly", value: "quarterly" },
                    { label: "Annual", value: "annual" },
                  ]}
                />
                <SelectField
                  name="withdrawalFrequency"
                  label="Withdrawal frequency"
                  hint="How often retirement income is taken from the portfolio."
                  options={[
                    { label: "Monthly", value: "monthly" },
                    { label: "Quarterly", value: "quarterly" },
                    { label: "Annual", value: "annual" },
                  ]}
                />
                <NumberField
                  name="inflationRate"
                  label="Inflation rate"
                  hint="Inflates retirement spending each year in the model."
                  step="0.001"
                />
                <NumberField
                  name="annualWithdrawalIncrease"
                  label="Extra withdrawal increase"
                  hint="Separate from inflation. Use this for lifestyle creep or planned spending bumps."
                  step="0.001"
                />
              </div>
            </section>
          </Tabs.Content>
        </Tabs.Root>

        <section className="mt-6 space-y-4 rounded-[1.75rem] border border-white/10 bg-black/14 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">Local scenario tools</p>
              <p className="text-sm text-slate-100/72">Last saved: {lastSavedAt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveCurrentScenario}
                className="rounded-full bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-cyan-100"
              >
                Save to browser
              </button>
              <button
                type="button"
                onClick={exportCurrentScenario}
                className="rounded-full border border-white/14 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="rounded-full border border-white/14 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                Import JSON
              </button>
            </div>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={handleScenarioImport}
            className="hidden"
          />

          <p className="text-sm leading-6 text-slate-100/78">{storageMessage}</p>

          <div className="space-y-3">
            {savedScenarios.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-white/14 bg-black/14 px-4 py-4 text-sm leading-6 text-slate-100/70">
                Saved scenarios appear here. Keep the current draft unsaved if you
                just want quick iterations, or save it to compare later.
              </div>
            ) : (
              savedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-white">{scenario.name}</p>
                      <p className="text-sm text-slate-100/68">
                        Updated {formatTimestamp(scenario.updatedAt)}
                      </p>
                      <p className="text-sm text-slate-100/68">
                        {formatCurrency(
                          calculateJourney(scenario.input).accumulation.retirementBalance,
                        )}{" "}
                        at retirement, target{" "}
                        {formatCurrency(scenario.input.retirementGoal)}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-100/72">
                        <input
                          type="checkbox"
                          checked={compareSelection.includes(scenario.id)}
                          onChange={() => toggleComparison(scenario.id)}
                          className="h-4 w-4 accent-cyan-200"
                        />
                        Compare
                      </label>
                      <button
                        type="button"
                        onClick={() => loadScenario(scenario)}
                        className="rounded-full border border-white/14 px-3 py-2 text-sm text-white transition hover:bg-white/8"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => exportSavedScenario(scenario)}
                        className="rounded-full border border-white/14 px-3 py-2 text-sm text-white transition hover:bg-white/8"
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => removeScenario(scenario.id)}
                        className="rounded-full border border-rose-200/24 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-200/8"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="space-y-5"
      >
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-3xl text-white">{view.title}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/72">
                {view.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {view.summary.map((item) => (
              <SummaryCard key={item.label} {...item} />
            ))}
          </div>
        </div>

        <section className="glass-panel rounded-[2rem] p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-100/58">
                Goal readout
              </p>
              <p className="mt-3 font-display text-2xl text-white">
                {accumulation.canReachGoal
                  ? formatCurrency(accumulation.requiredMonthlyContribution)
                  : "Stretch target"}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-100/74">
                {retirementGoalCopy}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-100/58">
                Sustainability check
              </p>
              <p className="mt-3 font-display text-2xl text-white">
                {journey.withdrawal.sustainableThroughLifeExpectancy
                  ? "Still funded"
                  : "Needs adjustment"}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-100/74">
                {journeyCopy}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-100/58">
                Highest-impact change
              </p>
              <p className="mt-3 font-display text-2xl text-white">
                {mostHelpfulChange.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-100/74">
                {mostHelpfulChange.description} Based on this scenario, it changes
                the ending balance by{" "}
                {formatCurrency(mostHelpfulChange.deltaEndingBalance)}.
              </p>
            </div>
          </div>
        </section>

        <PlannerChart
          title={view.chartTitle}
          subtitle={view.chartSubtitle}
          xValues={view.chartX}
          series={view.chartSeries}
        />

        <section className="glass-panel rounded-[2rem] p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-2xl text-white">
                What changes move the result most
              </p>
              <p className="text-sm leading-6 text-slate-200/72">
                These are deterministic one-change-at-a-time comparisons, useful
                for intuition but not guarantees.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {opportunityInsights.map((insight) => (
              <article
                key={insight.id}
                className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{insight.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-100/72">
                      {insight.description}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      insight.deltaEndingBalance >= 0
                        ? "bg-lime-300/18 text-lime-50"
                        : "bg-rose-300/18 text-rose-50"
                    }`}
                  >
                    {insight.deltaEndingBalance >= 0 ? "+" : ""}
                    {formatCurrency(insight.deltaEndingBalance)}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-100/54">
                  Retirement hand-off impact{" "}
                  {formatCurrency(insight.deltaRetirementBalance)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-2xl text-white">Scenario compare</p>
              <p className="text-sm leading-6 text-slate-200/72">
                The current scenario is always included. Add up to three saved
                scenarios from the left panel.
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-100/52">
              {comparisonEntries.length} scenarios shown
            </p>
          </div>

          {comparisonEntries.length > 1 ? (
            <PlannerChart
              title="Portfolio paths side by side"
              subtitle="Compare the current draft against saved scenarios using the full journey timeline."
              xValues={comparisonChart.xValues}
              series={comparisonChart.series}
            />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/14 bg-black/14 px-4 py-6 text-sm leading-6 text-slate-100/70">
              Save at least one scenario and toggle Compare to see multiple
              timelines together.
            </div>
          )}
        </section>

        <section className="glass-panel rounded-[2rem] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-2xl text-white">
                Recent yearly checkpoints
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200/72">
                A table view makes the assumptions auditable, not just visual.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-100/82">
              <thead className="bg-white/6 text-xs uppercase tracking-[0.2em] text-slate-100/58">
                <tr>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Saved</th>
                  <th className="px-4 py-3">Growth</th>
                  <th className="px-4 py-3">Withdrawals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-black/12">
                {view.rows.map((row) => (
                  <tr key={`${activeTab}-${row.age}`}>
                    <td className="px-4 py-3">{row.age}</td>
                    <td className="px-4 py-3">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.contributions)}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(row.growth)}</td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.withdrawals)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5">
          <p className="font-display text-2xl text-white">Assumptions and limits</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4 text-sm leading-6 text-slate-100/76">
              Results are estimates, not financial advice. The model uses fixed
              annual return assumptions before and during retirement and does not
              include taxes, fees, Social Security, or pensions.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/16 p-4 text-sm leading-6 text-slate-100/76">
              The main planner is intentionally local-first. The API mirrors the
              deterministic math for testing and future integrations, but normal
              interaction does not depend on a round trip.
            </div>
          </div>
        </section>
      </motion.section>
    </div>
  );
}
