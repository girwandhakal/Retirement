"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useDeferredValue, useState } from "react";
import { useController, useForm, type UseFormReturn } from "react-hook-form";

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
import {
  defaultPlannerInput,
  type PlannerInput,
  type PlannerMode,
  type TimelinePoint,
  plannerInputSchema,
} from "@/lib/types";

type NumberFieldName =
  | "currentAge"
  | "retirementAge"
  | "lifeExpectancy"
  | "initialBalance"
  | "retirementGoal"
  | "monthlyContribution"
  | "annualReturnBeforeRetirement"
  | "annualReturnDuringRetirement"
  | "annualContributionGrowthRate"
  | "withdrawalAmount"
  | "inflationRate"
  | "annualWithdrawalIncrease";

type SelectFieldName = "compoundingFrequency" | "withdrawalFrequency";

type YearlyLedgerRow = {
  ageEnd: number;
  ageStart: number;
  endingBalance: number;
  id: string;
  interest: number;
  startingBalance: number;
  withdrawals: number;
  yearNumber: number;
};

function roundLedgerValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatInputValue(value: number) {
  return value
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function buildYearlyLedgerRows(
  timeline: TimelinePoint[],
  startingYearNumber = 0,
): YearlyLedgerRow[] {
  return timeline.slice(1).map((point, index) => {
    const previous = timeline[index];

    return {
      ageEnd: point.age,
      ageStart: previous.age,
      endingBalance: point.balance,
      id: `${startingYearNumber + index + 1}-${previous.age}-${point.age}`,
      interest: roundLedgerValue(point.growth - previous.growth),
      startingBalance: previous.balance,
      withdrawals: roundLedgerValue(point.withdrawals - previous.withdrawals),
      yearNumber: startingYearNumber + index + 1,
    };
  });
}

function NumberField(props: {
  form: UseFormReturn<PlannerInput>;
  hint: string;
  label: string;
  name: NumberFieldName;
  percent?: boolean;
  step?: string;
}) {
  const { field, fieldState } = useController({
    control: props.form.control,
    name: props.name,
  });
  const rawValue =
    typeof field.value === "number" && Number.isFinite(field.value) ? field.value : null;
  const displayValue =
    rawValue === null
      ? ""
      : formatInputValue(props.percent ? rawValue * 100 : rawValue);

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/86">{props.label}</span>
        <FieldHint>{props.hint}</FieldHint>
      </div>
      <input
        type="number"
        inputMode="decimal"
        step={props.step ?? (props.percent ? "0.1" : "1")}
        name={field.name}
        ref={field.ref}
        value={displayValue}
        onBlur={field.onBlur}
        onChange={(event) => {
          const raw = event.target.value;

          if (raw === "") {
            field.onChange(Number.NaN);
            return;
          }

          const parsed = Number(raw);
          field.onChange(props.percent ? parsed / 100 : parsed);
        }}
        className="w-full rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400/70 focus:border-cyan-200/40"
      />
      {fieldState.error ? (
        <p className="text-xs text-rose-200">{fieldState.error.message}</p>
      ) : null}
    </label>
  );
}

function SelectField(props: {
  form: UseFormReturn<PlannerInput>;
  hint: string;
  label: string;
  name: SelectFieldName;
  options: Array<{ label: string; value: string }>;
}) {
  const error = props.form.formState.errors[props.name];

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/86">{props.label}</span>
        <FieldHint>{props.hint}</FieldHint>
      </div>
      <select
        {...props.form.register(props.name)}
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

export function PlannerShell() {
  const [activeTab, setActiveTab] = useState<PlannerMode>("journey");

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
  const yearlyLedgerRows = [
    ...buildYearlyLedgerRows(accumulation.timeline),
    ...buildYearlyLedgerRows(journey.withdrawal.timeline, accumulation.timeline.length - 1),
  ];

  const view =
    activeTab === "save"
      ? {
          title: "Save for retirement",
          subtitle:
            "Measure how current savings and return assumptions compare with the retirement target.",
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
              caption: "Estimated portfolio value when retirement begins.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("sky" as const),
            },
            {
              label: "Retirement goal gap",
              value:
                accumulation.goalGap >= 0
                  ? formatCurrency(accumulation.goalGap)
                  : `-${formatCurrency(Math.abs(accumulation.goalGap))}`,
              caption: "Positive clears the target; negative means more savings are needed.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("rose" as const),
            },
            {
              label: "Monthly contribution needed",
              value: formatCurrency(accumulation.requiredMonthlyContribution),
              caption: accumulation.canReachGoal
                ? "Estimated monthly savings needed to reach the target."
                : "Current assumptions do not reach the target within the modeled bounds.",
              accent: "gold" as const,
            },
            {
              label: "4% monthly income guide",
              value: formatCurrency(accumulation.monthlyIncomeEstimate),
              caption: "Rule-of-thumb monthly income based on a 4% annual withdrawal rate.",
              accent: "sky" as const,
            },
          ],
        }
      : activeTab === "withdraw"
        ? {
            title: "Withdraw in retirement",
            subtitle:
              "See how long the portfolio may last after contributions stop and withdrawals begin.",
            chartTitle: "Retirement drawdown",
            chartSubtitle:
              "This view starts from today's portfolio balance and models the drawdown path independently.",
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
                caption: "This standalone retirement view starts from the current portfolio balance.",
                accent: "sky" as const,
              },
              {
                label: "Years covered",
                value: formatYears(standaloneWithdrawal.yearsCovered),
                caption: "Years before the balance first turns negative in the model.",
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
                caption: "First modeled age when the retirement balance drops below zero.",
                accent:
                  standaloneWithdrawal.depletionAge === null
                    ? ("lime" as const)
                    : ("rose" as const),
              },
              {
                label: "Ending balance",
                value: formatCurrency(standaloneWithdrawal.endingBalance),
                caption: "Balance remaining at the life expectancy horizon.",
                accent:
                  standaloneWithdrawal.endingBalance >= 0
                    ? ("lime" as const)
                    : ("rose" as const),
              },
            ],
          }
        : {
            title: "Full retirement journey",
            subtitle:
              "Connect the saving years and spending years in one deterministic timeline.",
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
                caption: "Projected hand-off from the saving phase into withdrawals.",
                accent: "sky" as const,
              },
              {
                label: "Surplus or shortfall",
                value: formatCurrency(journey.shortfallOrSurplus),
                caption: "Positive leaves money at the horizon; negative means it runs out early.",
                accent: journey.shortfallOrSurplus >= 0 ? ("lime" as const) : ("rose" as const),
              },
              {
                label: "Goal funding ratio",
                value: formatPercent(accumulation.goalFundingRatio),
                caption: "Share of the retirement target funded by the current saving plan.",
                accent: accumulation.goalFundingRatio >= 1 ? ("lime" as const) : ("gold" as const),
              },
              {
                label: "Income target",
                value: formatCurrency(input.withdrawalAmount),
                caption: `Modeled as a ${input.withdrawalFrequency} retirement withdrawal target.`,
                accent: "gold" as const,
              },
            ],
          };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel rounded-[2rem] p-5 sm:p-6"
      >
        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-200/58">
                Essential inputs
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                form={form}
                name="currentAge"
                label="Current age"
                hint="Used to determine how long contributions can compound."
              />
              <NumberField
                form={form}
                name="retirementAge"
                label="Retirement age"
                hint="The age when the planner switches from saving to spending."
              />
              <NumberField
                form={form}
                name="lifeExpectancy"
                label="Life expectancy target"
                hint="The end horizon for the sustainability check."
              />
              <NumberField
                form={form}
                name="retirementGoal"
                label="Retirement goal ($)"
                hint="A target portfolio value at retirement for measuring readiness."
              />
              <NumberField
                form={form}
                name="initialBalance"
                label="Current portfolio balance ($)"
                hint="Starting investment balance before new contributions."
              />
              <NumberField
                form={form}
                name="monthlyContribution"
                label="Monthly contribution ($)"
                hint="Amount invested every month before retirement."
              />
              <NumberField
                form={form}
                name="withdrawalAmount"
                label="Withdrawal amount ($)"
                hint="Spending target in retirement, applied at the frequency chosen below."
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
                form={form}
                name="annualReturnBeforeRetirement"
                label="Annual return before retirement (%)"
                hint="Expected long-run portfolio growth during the saving years."
                percent
              />
              <NumberField
                form={form}
                name="annualReturnDuringRetirement"
                label="Annual return during retirement (%)"
                hint="Expected growth after withdrawals begin."
                percent
              />
              <NumberField
                form={form}
                name="annualContributionGrowthRate"
                label="Annual contribution growth (%)"
                hint="Use this to model raises or planned savings increases over time."
                percent
              />
              <SelectField
                form={form}
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
                form={form}
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
                form={form}
                name="inflationRate"
                label="Inflation rate (%)"
                hint="Inflates retirement spending each year in the model."
                percent
              />
              <NumberField
                form={form}
                name="annualWithdrawalIncrease"
                label="Extra withdrawal increase (%)"
                hint="Separate from inflation. Use this for lifestyle creep or planned spending bumps."
                percent
              />
            </div>
          </section>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="space-y-5"
      >
        <div className="glass-panel rounded-[2rem] p-5">
          <Tabs.Root
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlannerMode)}
          >
            <Tabs.List className="mb-5 grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/10 bg-black/16 p-2">
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
          </Tabs.Root>
          <div className="mb-5 min-h-[7.5rem] sm:min-h-[6.5rem]">
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
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel rounded-[2rem] p-5 lg:col-span-2"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-white">
              Recent yearly checkpoints
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200/72">
              The full year-by-year ledger covers both the saving period and the
              retirement drawdown. Scroll to review every modeled year.
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-[31rem] overflow-auto rounded-[1.5rem] border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-100/82">
            <thead className="sticky top-0 bg-[#10233a]/92 text-xs uppercase tracking-[0.2em] text-slate-100/58 backdrop-blur">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Withdrawals</th>
                <th className="px-4 py-3">End balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8 bg-black/12">
              {yearlyLedgerRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white">Year {row.yearNumber}</div>
                    <div className="text-xs text-slate-100/56">
                      Age {row.ageStart} to {row.ageEnd}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(row.startingBalance)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.interest)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.withdrawals)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
