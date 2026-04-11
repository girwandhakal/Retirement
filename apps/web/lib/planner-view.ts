import { formatCurrency, formatPercent, formatYears } from "@/lib/format";
import type {
  AccumulationResult,
  JourneyResult,
  PlannerInput,
  PlannerMode,
} from "@/lib/types";

export type PlannerView = {
  chartSeries: Array<{
    color: string;
    label: string;
    values: Array<number | null>;
  }>;
  chartTitle: string;
  chartX: number[];
  summary: Array<{
    accent?: "sky" | "lime" | "gold" | "rose";
    caption: string;
    label: string;
    value: string;
  }>;
  title: string;
};

export function buildPlannerView(args: {
  accumulation: AccumulationResult;
  activeTab: PlannerMode;
  input: PlannerInput;
  journey: JourneyResult;
}): PlannerView {
  const { accumulation, activeTab, input, journey } = args;

  if (activeTab === "save") {
    return {
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
          caption:
            accumulation.goalGap >= 0
              ? "Surplus above your target."
              : "Shortfall below your target.",
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
    };
  }

  if (activeTab === "withdraw") {
    return {
      title: "Withdraw in retirement",
      chartTitle: "Retirement drawdown",
      chartX: journey.withdrawal.timeline.map((point) => point.age),
      chartSeries: [
        {
          label: "Remaining balance",
          color: "#ffd69a",
          values: journey.withdrawal.timeline.map((point) => point.balance),
        },
        {
          label: "Withdrawals taken",
          color: "#ffc6d0",
          values: journey.withdrawal.timeline.map((point) => point.withdrawals),
        },
      ],
      summary: [
        {
          label: "Amount at retirement",
          value: formatCurrency(journey.withdrawal.startingBalance),
          caption: "Projected portfolio value when retirement withdrawals begin.",
          accent: "sky" as const,
        },
        {
          label: "Years covered",
          value: formatYears(journey.withdrawal.yearsCovered),
          caption: "Years before funds run out.",
          accent: journey.withdrawal.sustainableThroughLifeExpectancy
            ? ("lime" as const)
            : ("gold" as const),
        },
        {
          label: "Depletion age",
          value:
            journey.withdrawal.depletionAge === null
              ? "Not depleted"
              : journey.withdrawal.depletionAge.toFixed(1),
          caption:
            journey.withdrawal.depletionAge === null
              ? "Portfolio lasts through retirement."
              : "Age when balance reaches zero.",
          accent:
            journey.withdrawal.depletionAge === null
              ? ("lime" as const)
              : ("rose" as const),
        },
        {
          label: "Ending balance",
          value: formatCurrency(journey.withdrawal.endingBalance),
          caption: "Remaining at life expectancy.",
          accent:
            journey.withdrawal.endingBalance >= 0
              ? ("lime" as const)
              : ("rose" as const),
        },
      ],
    };
  }

  return {
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
        caption:
          journey.shortfallOrSurplus >= 0
            ? "Money remaining at the end."
            : "Runs out before life expectancy.",
        accent:
          journey.shortfallOrSurplus >= 0
            ? ("lime" as const)
            : ("rose" as const),
      },
      {
        label: "Goal funding ratio",
        value: formatPercent(accumulation.goalFundingRatio),
        caption: "How much of your goal is funded.",
        accent:
          accumulation.goalFundingRatio >= 1
            ? ("lime" as const)
            : ("gold" as const),
      },
      {
        label: "Income target",
        value: formatCurrency(input.withdrawalAmount),
        caption: `${input.withdrawalFrequency.charAt(0).toUpperCase() + input.withdrawalFrequency.slice(1)} withdrawal amount.`,
        accent: "gold" as const,
      },
    ],
  };
}
