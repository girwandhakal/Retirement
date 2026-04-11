"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useController, useForm, type UseFormReturn } from "react-hook-form";

import { FieldHint } from "@/components/field-hint";
import { PlannerChart } from "@/components/planner-chart";
import { SummaryCard } from "@/components/summary-card";
import { fetchPlannerResultSet } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import {
  calculatePlannerResultSet,
  coercePlannerInput,
} from "@/lib/planner";
import { buildPlannerView } from "@/lib/planner-view";
import {
  defaultPlannerInput,
  type PlannerInput,
  type PlannerMode,
  type PlannerResultSet,
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
  const plannerRequestBody = JSON.stringify(input);
  const localResults = calculatePlannerResultSet(input);
  const [apiResults, setApiResults] = useState<PlannerResultSet | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const requestInput = JSON.parse(plannerRequestBody) as PlannerInput;

    startTransition(() => {
      setApiResults(null);
    });

    void fetchPlannerResultSet(requestInput, abortController.signal)
      .then((result) => {
        startTransition(() => {
          setApiResults(result);
          setBackendUnavailable(false);
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        startTransition(() => {
          setApiResults(null);
          setBackendUnavailable(true);
        });
      });

    return () => {
      abortController.abort();
    };
  }, [plannerRequestBody]);

  const accumulation = apiResults?.accumulation ?? localResults.accumulation;
  const journey = apiResults?.journey ?? localResults.journey;
  const yearlyLedgerRows = [
    ...buildYearlyLedgerRows(accumulation.timeline),
    ...buildYearlyLedgerRows(journey.withdrawal.timeline, accumulation.timeline.length - 1),
  ];
  const view = buildPlannerView({
    activeTab,
    accumulation,
    input,
    journey,
  });

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
        className="glass-panel min-w-0 rounded-[1.25rem] p-4 sm:rounded-[2rem] sm:p-5 md:p-6 lg:sticky lg:top-6 lg:self-start"
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
              {backendUnavailable ? (
                <p className="mt-3 text-xs text-amber-100/72 sm:text-sm">
                  Backend unavailable. Showing browser fallback calculations until the API responds again.
                </p>
              ) : null}
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

        <div className="-mx-4 -mb-4 mt-3 max-h-[24rem] overflow-auto border-t border-white/10 sm:-mx-5 sm:-mb-5 sm:mt-4 sm:max-h-[31rem]">
          <table className="min-w-[36rem] divide-y divide-white/10 text-left text-xs text-slate-100/82 sm:min-w-full sm:text-sm">
            <thead className="sticky top-0 bg-[#10233a] text-[10px] uppercase tracking-[0.2em] text-slate-100/58 sm:text-xs">
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
