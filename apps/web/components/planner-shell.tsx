"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { startTransition, useDeferredValue, useState } from "react";
import { useForm } from "react-hook-form";

import { FieldHint } from "@/components/field-hint";
import { PlannerChart } from "@/components/planner-chart";
import { SummaryCard } from "@/components/summary-card";
import { formatCurrency, formatPercent, formatYears } from "@/lib/format";
import {
  calculateAccumulation,
  calculateJourney,
  calculateWithdrawal,
  coercePlannerInput,
} from "@/lib/planner";
import { scenarioPresets } from "@/lib/presets";
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
  | "monthlyContribution"
  | "annualReturnBeforeRetirement"
  | "annualReturnDuringRetirement"
  | "annualContributionGrowthRate"
  | "withdrawalAmount"
  | "inflationRate"
  | "annualWithdrawalIncrease";

export function PlannerShell() {
  const [activeTab, setActiveTab] = useState<PlannerMode>("journey");
  const [lastSavedAt, setLastSavedAt] = useState<string>("Not saved yet");

  const form = useForm<PlannerInput>({
    resolver: zodResolver(plannerInputSchema),
    mode: "onChange",
    defaultValues: defaultPlannerInput,
  });

  const watchedValues = useDeferredValue(form.watch());
  const input = coercePlannerInput(watchedValues);

  const accumulation = calculateAccumulation(input);
  const standaloneWithdrawal = calculateWithdrawal(input);
  const journey = calculateJourney(input);

  const view =
    activeTab === "save"
      ? {
          title: "Retirement growth",
          subtitle: "Project the runway from today until retirement.",
          chartTitle: "Portfolio build-up",
          chartSubtitle:
            "The core MVP chart overlays total saved principal against projected portfolio value.",
          chartX: accumulation.timeline.map((point) => point.age),
          chartSeries: [
            {
              label: "Projected balance",
              color: "#aefcff",
              values: accumulation.timeline.map((point) => point.balance),
            },
            {
              label: "Saved principal",
              color: "#d7f58c",
              values: accumulation.timeline.map((point) => point.contributions),
            },
          ],
          summary: [
            {
              label: "Projected at retirement",
              value: formatCurrency(accumulation.retirementBalance),
              caption: "Estimated portfolio value at retirement age.",
              accent: "sky" as const,
            },
            {
              label: "Principal invested",
              value: formatCurrency(accumulation.totalContributions),
              caption: "Initial balance plus every planned contribution.",
              accent: "lime" as const,
            },
            {
              label: "Growth earned",
              value: formatCurrency(accumulation.totalGrowth),
              caption: "Projected investment growth before retirement.",
              accent: "gold" as const,
            },
            {
              label: "4% monthly income",
              value: formatCurrency(accumulation.monthlyIncomeEstimate),
              caption: "Rough spending estimate based on a 4% rule proxy.",
              accent: "rose" as const,
            },
          ],
          rows: accumulation.timeline.slice(-6),
        }
      : activeTab === "withdraw"
        ? {
            title: "Retirement withdrawal",
            subtitle:
              "See how long the portfolio can sustain the current spending plan.",
            chartTitle: "Drawdown path",
            chartSubtitle:
              "The chart tracks remaining balance during retirement under fixed return assumptions.",
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
                caption:
                  "Uses the retirement override when set, otherwise the current balance.",
                accent: "sky" as const,
              },
              {
                label: "Years covered",
                value: formatYears(standaloneWithdrawal.yearsCovered),
                caption: "How long the current plan lasts under fixed assumptions.",
                accent: "gold" as const,
              },
              {
                label: "Depletion age",
                value:
                  standaloneWithdrawal.depletionAge === null
                    ? "Not depleted"
                    : standaloneWithdrawal.depletionAge.toFixed(1),
                caption: "First modeled age where the balance falls below zero.",
                accent: "rose" as const,
              },
              {
                label: "Ending balance",
                value: formatCurrency(standaloneWithdrawal.endingBalance),
                caption: "Balance at the life-expectancy target horizon.",
                accent: "lime" as const,
              },
            ],
            rows: standaloneWithdrawal.timeline.slice(-6),
          }
        : {
            title: "Combined journey",
            subtitle:
              "Connect the saving years to the spending years in one scenario.",
            chartTitle: "End-to-end timeline",
            chartSubtitle:
              "The journey view uses the projected retirement balance as the starting point for withdrawals.",
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
                caption: "Projected hand-off from saving to spending.",
                accent: "sky" as const,
              },
              {
                label: "Income target",
                value: formatCurrency(input.withdrawalAmount),
                caption: `Modeled as a ${input.withdrawalFrequency} withdrawal.`,
                accent: "gold" as const,
              },
              {
                label: "Surplus / shortfall",
                value: formatCurrency(journey.shortfallOrSurplus),
                caption: "Positive means money remains at the life-expectancy target.",
                accent: journey.shortfallOrSurplus >= 0 ? "lime" : "rose",
              },
              {
                label: "Pre-retirement return",
                value: formatPercent(input.annualReturnBeforeRetirement),
                caption: "One of the highest-leverage assumptions in the model.",
                accent: "rose" as const,
              },
            ],
            rows: journey.timeline.slice(-6),
          };

  function applyPreset(preset: PlannerInput) {
    startTransition(() => {
      form.reset(preset);
    });
  }

  function saveScenarioLocally() {
    startTransition(() => {
      localStorage.setItem(
        "retirement-planner:last-scenario",
        JSON.stringify(form.getValues()),
      );
      setLastSavedAt(
        new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
      );
    });
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
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
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
                The scaffold keeps the core calculator local, typed, and fast.
                Tune the numbers, then save the scenario to browser storage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => form.reset(defaultPlannerInput)}
              className="rounded-full border border-white/14 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-100/72 transition hover:bg-white/8"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {scenarioPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.input)}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                name="currentAge"
                label="Current age"
                hint="Used to determine the saving timeline before retirement."
              />
              <NumberField
                name="retirementAge"
                label="Retirement age"
                hint="Age when the planner switches from contributions to withdrawals."
              />
              <NumberField
                name="lifeExpectancy"
                label="Life expectancy target"
                hint="The horizon used for retirement sustainability checks."
              />
              <NumberField
                name="initialBalance"
                label="Current portfolio balance ($)"
                hint="Starting investment balance before new contributions."
              />
              <NumberField
                name="monthlyContribution"
                label="Monthly contribution ($)"
                hint="Amount invested each month before retirement."
              />
              <NumberField
                name="retirementStartingBalance"
                label="Retirement starting balance override ($)"
                hint="Optional. Leave at 0 to use the projected retirement balance in combined mode."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                name="annualReturnBeforeRetirement"
                label="Annual return before retirement"
                hint="Expected portfolio growth during the accumulation years."
                step="0.001"
              />
              <NumberField
                name="annualReturnDuringRetirement"
                label="Annual return during retirement"
                hint="Expected growth rate after withdrawals begin."
                step="0.001"
              />
              <NumberField
                name="annualContributionGrowthRate"
                label="Annual contribution growth"
                hint="Used to model increasing savings over time."
                step="0.001"
              />
              <SelectField
                name="compoundingFrequency"
                label="Compounding frequency"
                hint="How often the model applies the annual return assumption."
                options={[
                  { label: "Monthly", value: "monthly" },
                  { label: "Quarterly", value: "quarterly" },
                  { label: "Annual", value: "annual" },
                ]}
              />
              <NumberField
                name="withdrawalAmount"
                label="Withdrawal amount ($)"
                hint="Spending target during retirement, in the frequency selected below."
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
                hint="Used to increase spending needs over time."
                step="0.001"
              />
              <NumberField
                name="annualWithdrawalIncrease"
                label="Additional annual withdrawal increase"
                hint="Separate from inflation. Use this for lifestyle creep or planned spending increases."
                step="0.001"
              />
            </div>
          </Tabs.Content>
        </Tabs.Root>

        <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/14 p-4 text-sm leading-6 text-slate-100/78">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">Local scenario save</p>
              <p>Last saved: {lastSavedAt}</p>
            </div>
            <button
              type="button"
              onClick={saveScenarioLocally}
              className="rounded-full bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-cyan-100"
            >
              Save to browser
            </button>
          </div>
          <p>
            Assumption note: pre-retirement and post-retirement returns are
            fixed in this first scaffold. The next layer should add shared
            fixtures, richer compare states, and probabilistic simulation.
          </p>
        </div>
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

        <PlannerChart
          title={view.chartTitle}
          subtitle={view.chartSubtitle}
          xValues={view.chartX}
          series={view.chartSeries}
        />

        <section className="glass-panel rounded-[2rem] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-2xl text-white">
                Recent yearly checkpoints
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200/72">
                A lightweight table so the product is not chart-only.
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
      </motion.section>
    </div>
  );
}

