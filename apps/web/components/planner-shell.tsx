"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
        className="interactive-field w-full rounded-2xl border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-400/70 focus:border-cyan-200/40 sm:px-4 sm:py-3"
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
        className="interactive-field w-full rounded-2xl border border-white/10 bg-black/18 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-200/40 sm:px-4 sm:py-3"
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
  const reduceMotion = useReducedMotion();

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
          chartTitle: "Portfolio growth vs. principal",
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
              caption: "Estimated portfolio value at retirement.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("sky" as const),
            },
            {
              label: "Retirement goal gap",
              value:
                accumulation.goalGap >= 0
                  ? formatCurrency(accumulation.goalGap)
                  : `-${formatCurrency(Math.abs(accumulation.goalGap))}`,
              caption: accumulation.goalGap >= 0 ? "Surplus above your target." : "Shortfall below your target.",
              accent: accumulation.goalGap >= 0 ? ("lime" as const) : ("rose" as const),
            },
            {
              label: "Monthly contribution needed",
              value: formatCurrency(accumulation.requiredMonthlyContribution),
              caption: "Monthly savings to reach your goal.",
              accent: "gold" as const,
            },
            {
              label: "4% monthly income guide",
              value: formatCurrency(accumulation.monthlyIncomeEstimate),
              caption: "Based on the 4% annual withdrawal rule.",
              accent: "sky" as const,
            },
          ],
        }
      : activeTab === "withdraw"
        ? {
            title: "Withdraw in retirement",
            chartTitle: "Retirement drawdown",
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
                caption: "Your current portfolio balance.",
                accent: "sky" as const,
              },
              {
                label: "Years covered",
                value: formatYears(standaloneWithdrawal.yearsCovered),
                caption: "Years before funds run out.",
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
                caption: standaloneWithdrawal.depletionAge === null ? "Portfolio lasts through retirement." : "Age when balance reaches zero.",
                accent:
                  standaloneWithdrawal.depletionAge === null
                    ? ("lime" as const)
                    : ("rose" as const),
              },
              {
                label: "Ending balance",
                value: formatCurrency(standaloneWithdrawal.endingBalance),
                caption: "Remaining at life expectancy.",
                accent:
                  standaloneWithdrawal.endingBalance >= 0
                    ? ("lime" as const)
                    : ("rose" as const),
              },
            ],
          }
        : {
            title: "Full retirement journey",
            chartTitle: "Start-to-finish balance path",
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
                caption: "Portfolio value when withdrawals begin.",
                accent: "sky" as const,
              },
              {
                label: "Surplus or shortfall",
                value: formatCurrency(journey.shortfallOrSurplus),
                caption: journey.shortfallOrSurplus >= 0 ? "Money remaining at the end." : "Runs out before life expectancy.",
                accent: journey.shortfallOrSurplus >= 0 ? ("lime" as const) : ("rose" as const),
              },
              {
                label: "Goal funding ratio",
                value: formatPercent(accumulation.goalFundingRatio),
                caption: "How much of your goal is funded.",
                accent: accumulation.goalFundingRatio >= 1 ? ("lime" as const) : ("gold" as const),
              },
              {
                label: "Income target",
                value: formatCurrency(input.withdrawalAmount),
                caption: `${input.withdrawalFrequency.charAt(0).toUpperCase() + input.withdrawalFrequency.slice(1)} withdrawal amount.`,
                accent: "gold" as const,
              },
            ],
          };

  const titleSparkClass =
    activeTab === "save"
      ? "text-spark-sky"
      : activeTab === "withdraw"
        ? "text-spark-rose"
        : "text-spark-lime";

  const chartAccent =
    activeTab === "save"
      ? "sky"
      : activeTab === "withdraw"
        ? "rose"
        : "lime";

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel min-w-0 rounded-[1.25rem] p-4 sm:rounded-[2rem] sm:p-5 md:p-6"
      >
        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <p className="text-spark-sky text-xs uppercase tracking-[0.24em]">
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
              <p className="text-spark-gold text-xs uppercase tracking-[0.24em]">
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
        className="min-w-0 space-y-5"
      >
        <div className="glass-panel min-w-0 rounded-[1.25rem] p-4 sm:rounded-[2rem] sm:p-5">
          <Tabs.Root
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlannerMode)}
          >
            <Tabs.List className="mb-4 grid grid-cols-3 gap-1.5 rounded-[1rem] border border-white/10 bg-black/16 p-1.5 sm:mb-5 sm:gap-2 sm:rounded-[1.5rem] sm:p-2">
              <Tabs.Trigger
                value="save"
                className="interactive-chip rounded-[0.75rem] px-2.5 py-2 text-xs text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white data-[state=active]:shadow-[0_16px_32px_rgba(4,17,31,0.25)] sm:rounded-[1rem] sm:px-4 sm:py-3 sm:text-sm"
              >
                Save
              </Tabs.Trigger>
              <Tabs.Trigger
                value="withdraw"
                className="interactive-chip rounded-[0.75rem] px-2.5 py-2 text-xs text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white data-[state=active]:shadow-[0_16px_32px_rgba(4,17,31,0.25)] sm:rounded-[1rem] sm:px-4 sm:py-3 sm:text-sm"
              >
                Withdraw
              </Tabs.Trigger>
              <Tabs.Trigger
                value="journey"
                className="interactive-chip rounded-[0.75rem] px-2.5 py-2 text-xs text-slate-200/76 data-[state=active]:bg-white/12 data-[state=active]:text-white data-[state=active]:shadow-[0_16px_32px_rgba(4,17,31,0.25)] sm:rounded-[1rem] sm:px-4 sm:py-3 sm:text-sm"
              >
                Journey
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <div className="mb-4 sm:mb-5">
                <p className={`font-display text-2xl sm:text-3xl ${titleSparkClass}`}>
                  {view.title}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {view.summary.map((item) => (
                  <SummaryCard key={item.label} {...item} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <PlannerChart
          accent={chartAccent}
          title={view.chartTitle}
          xValues={view.chartX}
          series={view.chartSeries}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel min-w-0 overflow-hidden rounded-[1.25rem] p-4 sm:rounded-[2rem] sm:p-5 lg:col-span-2"
      >
        <p className="font-display text-xl text-white sm:text-2xl">
          Year by year
        </p>

        <div className="-mx-4 mt-3 max-h-[24rem] overflow-auto sm:mx-0 sm:mt-4 sm:max-h-[31rem] sm:rounded-[1.5rem] sm:border sm:border-white/10">
          <table className="min-w-[36rem] divide-y divide-white/10 text-left text-xs text-slate-100/82 sm:min-w-full sm:text-sm">
            <thead className="sticky top-0 bg-[#10233a]/92 text-[10px] uppercase tracking-[0.2em] text-slate-100/58 backdrop-blur sm:text-xs">
              <tr>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Year</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Balance</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Interest</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Withdrawals</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">End balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8 bg-black/12">
              {yearlyLedgerRows.map((row) => (
                <tr key={row.id} className="table-row">
                  <td className="px-3 py-2 align-top sm:px-4 sm:py-3">
                    <div className="font-medium text-white">Year {row.yearNumber}</div>
                    <div className="text-[10px] text-slate-100/56 sm:text-xs">
                      Age {row.ageStart} to {row.ageEnd}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3">{formatCurrency(row.startingBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3">{formatCurrency(row.interest)}</td>
                  <td className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3">{formatCurrency(row.withdrawals)}</td>
                  <td className="whitespace-nowrap px-3 py-2 sm:px-4 sm:py-3">{formatCurrency(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
