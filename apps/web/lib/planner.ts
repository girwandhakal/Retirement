import {
  type AccumulationResult,
  defaultPlannerInput,
  type JourneyResult,
  plannerInputSchema,
  type PlannerInput,
  type TimelinePoint,
  type WithdrawalResult,
} from "./types";

const compoundingIntervals: Record<
  PlannerInput["compoundingFrequency"],
  { months: number; rateDivisor: number }
> = {
  monthly: { months: 1, rateDivisor: 12 },
  quarterly: { months: 3, rateDivisor: 4 },
  annual: { months: 12, rateDivisor: 1 },
};

const withdrawalIntervals: Record<
  PlannerInput["withdrawalFrequency"],
  number
> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export type ComparisonSeries = {
  color: string;
  label: string;
  values: Array<number | null>;
};

export type OpportunityInsight = {
  deltaEndingBalance: number;
  deltaRetirementBalance: number;
  description: string;
  id: string;
  label: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function buildPoint(
  age: number,
  balance: number,
  contributions: number,
  growth: number,
  withdrawals: number,
): TimelinePoint {
  return {
    age,
    balance: roundMoney(balance),
    contributions: roundMoney(contributions),
    growth: roundMoney(growth),
    withdrawals: roundMoney(withdrawals),
  };
}

function yearlyWithdrawalBump(input: PlannerInput) {
  return (
    (1 + input.inflationRate) * (1 + input.annualWithdrawalIncrease) - 1
  );
}

function coerceNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function sanitizePlannerInput(raw: Partial<PlannerInput>) {
  const merged = {
    ...defaultPlannerInput,
    ...raw,
  };

  return {
    currentAge: Math.round(
      coerceNumber(merged.currentAge, defaultPlannerInput.currentAge, 18, 85),
    ),
    retirementAge: Math.round(
      coerceNumber(
        merged.retirementAge,
        defaultPlannerInput.retirementAge,
        40,
        85,
      ),
    ),
    lifeExpectancy: Math.round(
      coerceNumber(
        merged.lifeExpectancy,
        defaultPlannerInput.lifeExpectancy,
        60,
        110,
      ),
    ),
    initialBalance: coerceNumber(
      merged.initialBalance,
      defaultPlannerInput.initialBalance,
      0,
      50_000_000,
    ),
    retirementStartingBalance: coerceNumber(
      merged.retirementStartingBalance,
      defaultPlannerInput.retirementStartingBalance,
      0,
      50_000_000,
    ),
    retirementGoal: coerceNumber(
      merged.retirementGoal,
      defaultPlannerInput.retirementGoal,
      100_000,
      50_000_000,
    ),
    monthlyContribution: coerceNumber(
      merged.monthlyContribution,
      defaultPlannerInput.monthlyContribution,
      0,
      500_000,
    ),
    annualReturnBeforeRetirement: coerceNumber(
      merged.annualReturnBeforeRetirement,
      defaultPlannerInput.annualReturnBeforeRetirement,
      0,
      0.2,
    ),
    annualReturnDuringRetirement: coerceNumber(
      merged.annualReturnDuringRetirement,
      defaultPlannerInput.annualReturnDuringRetirement,
      0,
      0.2,
    ),
    compoundingFrequency:
      merged.compoundingFrequency ?? defaultPlannerInput.compoundingFrequency,
    annualContributionGrowthRate: coerceNumber(
      merged.annualContributionGrowthRate,
      defaultPlannerInput.annualContributionGrowthRate,
      0,
      0.1,
    ),
    withdrawalAmount: coerceNumber(
      merged.withdrawalAmount,
      defaultPlannerInput.withdrawalAmount,
      0,
      500_000,
    ),
    withdrawalFrequency:
      merged.withdrawalFrequency ?? defaultPlannerInput.withdrawalFrequency,
    inflationRate: coerceNumber(
      merged.inflationRate,
      defaultPlannerInput.inflationRate,
      0,
      0.1,
    ),
    annualWithdrawalIncrease: coerceNumber(
      merged.annualWithdrawalIncrease,
      defaultPlannerInput.annualWithdrawalIncrease,
      0,
      0.1,
    ),
  } satisfies PlannerInput;
}

function runAccumulation(
  input: PlannerInput,
  monthlyContribution = input.monthlyContribution,
) {
  const yearsToRetirement = input.retirementAge - input.currentAge;
  const totalMonths = yearsToRetirement * 12;
  const interval = compoundingIntervals[input.compoundingFrequency];

  let age = input.currentAge;
  let balance = input.initialBalance;
  let totalContributions = input.initialBalance;
  let totalGrowth = 0;
  let currentMonthlyContribution = monthlyContribution;

  const timeline: TimelinePoint[] = [
    buildPoint(age, balance, totalContributions, totalGrowth, 0),
  ];

  for (let month = 1; month <= totalMonths; month += 1) {
    balance += currentMonthlyContribution;
    totalContributions += currentMonthlyContribution;

    if (month % interval.months === 0) {
      const growth =
        balance * (input.annualReturnBeforeRetirement / interval.rateDivisor);
      balance += growth;
      totalGrowth += growth;
    }

    if (month % 12 === 0) {
      age += 1;
      timeline.push(
        buildPoint(age, balance, totalContributions, totalGrowth, 0),
      );
      currentMonthlyContribution *= 1 + input.annualContributionGrowthRate;
    }
  }

  return {
    yearsToRetirement,
    retirementBalance: roundMoney(balance),
    totalContributions: roundMoney(totalContributions),
    totalGrowth: roundMoney(totalGrowth),
    monthlyIncomeEstimate: roundMoney((balance * 0.04) / 12),
    timeline,
  };
}

function solveRequiredMonthlyContribution(input: PlannerInput) {
  const currentOutcome = runAccumulation(input, input.monthlyContribution);

  if (currentOutcome.retirementBalance >= input.retirementGoal) {
    return {
      additionalMonthlyContributionNeeded: 0,
      canReachGoal: true,
      requiredMonthlyContribution: roundMoney(input.monthlyContribution),
    };
  }

  let low = input.monthlyContribution;
  let high = Math.max(input.monthlyContribution * 2, 500);
  let canReachGoal = false;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (runAccumulation(input, high).retirementBalance >= input.retirementGoal) {
      canReachGoal = true;
      break;
    }
    high *= 2;
  }

  if (!canReachGoal) {
    return {
      additionalMonthlyContributionNeeded: roundMoney(high - input.monthlyContribution),
      canReachGoal: false,
      requiredMonthlyContribution: roundMoney(high),
    };
  }

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (low + high) / 2;
    const result = runAccumulation(input, mid);

    if (result.retirementBalance >= input.retirementGoal) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return {
    additionalMonthlyContributionNeeded: roundMoney(high - input.monthlyContribution),
    canReachGoal: true,
    requiredMonthlyContribution: roundMoney(high),
  };
}

function resolveStandaloneWithdrawalStart(input: PlannerInput) {
  return input.retirementStartingBalance > 0
    ? input.retirementStartingBalance
    : input.initialBalance;
}

export function coercePlannerInput(raw: Partial<PlannerInput>) {
  const parsed = plannerInputSchema.safeParse(sanitizePlannerInput(raw));

  if (parsed.success) {
    return parsed.data;
  }

  return defaultPlannerInput;
}

export function calculateAccumulation(input: PlannerInput): AccumulationResult {
  const base = runAccumulation(input);
  const contributionTarget = solveRequiredMonthlyContribution(input);
  const goalGap = roundMoney(base.retirementBalance - input.retirementGoal);

  return {
    ...base,
    additionalMonthlyContributionNeeded:
      contributionTarget.additionalMonthlyContributionNeeded,
    canReachGoal: contributionTarget.canReachGoal,
    goalFundingRatio: roundRatio(base.retirementBalance / input.retirementGoal),
    goalGap,
    requiredMonthlyContribution: contributionTarget.requiredMonthlyContribution,
  };
}

export function calculateWithdrawal(
  input: PlannerInput,
  startingBalance = resolveStandaloneWithdrawalStart(input),
): WithdrawalResult {
  const totalMonths = (input.lifeExpectancy - input.retirementAge) * 12;
  const compounding = compoundingIntervals[input.compoundingFrequency];
  const withdrawalInterval = withdrawalIntervals[input.withdrawalFrequency];

  let age = input.retirementAge;
  let balance = startingBalance;
  let totalGrowth = 0;
  let totalWithdrawals = 0;
  let withdrawalAmount = input.withdrawalAmount;
  let depletionAge: number | null = null;

  const timeline: TimelinePoint[] = [
    buildPoint(age, balance, 0, totalGrowth, totalWithdrawals),
  ];

  for (let month = 1; month <= totalMonths; month += 1) {
    if (month % withdrawalInterval === 0) {
      balance -= withdrawalAmount;
      totalWithdrawals += withdrawalAmount;
    }

    if (balance > 0 && month % compounding.months === 0) {
      const growth =
        balance * (input.annualReturnDuringRetirement / compounding.rateDivisor);
      balance += growth;
      totalGrowth += growth;
    }

    if (balance <= 0 && depletionAge === null) {
      depletionAge = input.retirementAge + month / 12;
    }

    if (month % 12 === 0) {
      age += 1;
      timeline.push(buildPoint(age, balance, 0, totalGrowth, totalWithdrawals));
      withdrawalAmount *= 1 + yearlyWithdrawalBump(input);
    }
  }

  return {
    startingBalance: roundMoney(startingBalance),
    endingBalance: roundMoney(balance),
    totalWithdrawals: roundMoney(totalWithdrawals),
    yearsCovered: depletionAge
      ? roundMoney(depletionAge - input.retirementAge)
      : totalMonths / 12,
    depletionAge: depletionAge ? roundMoney(depletionAge) : null,
    sustainableThroughLifeExpectancy: balance >= 0,
    timeline,
  };
}

export function calculateJourney(input: PlannerInput): JourneyResult {
  const accumulation = calculateAccumulation(input);
  const withdrawal = calculateWithdrawal(input, accumulation.retirementBalance);

  return {
    accumulation,
    withdrawal,
    shortfallOrSurplus: roundMoney(withdrawal.endingBalance),
    timeline: [...accumulation.timeline.slice(0, -1), ...withdrawal.timeline],
  };
}

export function buildComparisonData(
  entries: Array<{
    color: string;
    label: string;
    timeline: TimelinePoint[];
  }>,
): {
  series: ComparisonSeries[];
  xValues: number[];
} {
  const xValues = [...new Set(entries.flatMap((entry) => entry.timeline.map((point) => point.age)))].sort(
    (left, right) => left - right,
  );

  const series = entries.map((entry) => {
    const balanceByAge = new Map(
      entry.timeline.map((point) => [point.age, point.balance]),
    );

    return {
      color: entry.color,
      label: entry.label,
      values: xValues.map((age) => balanceByAge.get(age) ?? null),
    };
  });

  return {
    xValues,
    series,
  };
}

export function buildOpportunityInsights(
  input: PlannerInput,
): OpportunityInsight[] {
  const baseJourney = calculateJourney(input);

  const candidates: Array<{
    description: string;
    id: string;
    input: PlannerInput;
    label: string;
  }> = [
    {
      id: "contribution",
      label: "Save $250 more monthly",
      description: "Increasing regular savings has a direct effect on the retirement hand-off balance.",
      input: {
        ...input,
        monthlyContribution: input.monthlyContribution + 250,
      },
    },
    {
      id: "retirement-age",
      label: "Work one more year",
      description: "A later retirement both adds contributions and shortens the withdrawal window.",
      input: {
        ...input,
        retirementAge: Math.min(input.retirementAge + 1, input.lifeExpectancy - 1),
      },
    },
    {
      id: "returns",
      label: "Raise return assumptions by 1%",
      description: "Use cautiously. Small changes in return assumptions can have large long-run effects.",
      input: {
        ...input,
        annualReturnBeforeRetirement: Math.min(
          input.annualReturnBeforeRetirement + 0.01,
          0.2,
        ),
        annualReturnDuringRetirement: Math.min(
          input.annualReturnDuringRetirement + 0.01,
          0.2,
        ),
      },
    },
    {
      id: "withdrawal",
      label: "Spend $250 less monthly",
      description: "Reducing planned retirement withdrawals eases portfolio drawdown pressure.",
      input: {
        ...input,
        withdrawalAmount: Math.max(0, input.withdrawalAmount - 250),
      },
    },
  ];

  return candidates
    .map((candidate) => {
      const result = calculateJourney(candidate.input);
      return {
        deltaEndingBalance: roundMoney(
          result.shortfallOrSurplus - baseJourney.shortfallOrSurplus,
        ),
        deltaRetirementBalance: roundMoney(
          result.accumulation.retirementBalance -
            baseJourney.accumulation.retirementBalance,
        ),
        description: candidate.description,
        id: candidate.id,
        label: candidate.label,
      };
    })
    .sort((left, right) => right.deltaEndingBalance - left.deltaEndingBalance);
}
