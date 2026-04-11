import {
  type AccumulationResult,
  defaultPlannerInput,
  type JourneyResult,
  type PlannerResultSet,
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

type WithdrawalSimulation = {
  rawEndingBalance: number;
  result: WithdrawalResult;
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
      0,
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
  if (input.retirementGoal <= 0) {
    return {
      additionalMonthlyContributionNeeded: 0,
      canReachGoal: true,
      requiredMonthlyContribution: 0,
    };
  }

  const currentOutcome = runAccumulation(input, input.monthlyContribution);
  let low = 0;
  let high = Math.max(input.monthlyContribution, 500);
  let canReachGoal = currentOutcome.retirementBalance >= input.retirementGoal;

  if (!canReachGoal) {
    for (let attempt = 0; attempt < 18; attempt += 1) {
      if (runAccumulation(input, high).retirementBalance >= input.retirementGoal) {
        canReachGoal = true;
        break;
      }
      high *= 2;
    }
  }

  if (!canReachGoal) {
    return {
      additionalMonthlyContributionNeeded: roundMoney(
        Math.max(0, high - input.monthlyContribution),
      ),
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
    additionalMonthlyContributionNeeded: roundMoney(
      Math.max(0, high - input.monthlyContribution),
    ),
    canReachGoal: true,
    requiredMonthlyContribution: roundMoney(high),
  };
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
  const goalGap =
    input.retirementGoal > 0
      ? roundMoney(base.retirementBalance - input.retirementGoal)
      : 0;

  return {
    ...base,
    additionalMonthlyContributionNeeded:
      contributionTarget.additionalMonthlyContributionNeeded,
    canReachGoal: contributionTarget.canReachGoal,
    goalFundingRatio:
      input.retirementGoal > 0
        ? roundRatio(base.retirementBalance / input.retirementGoal)
        : 0,
    goalGap,
    requiredMonthlyContribution: contributionTarget.requiredMonthlyContribution,
  };
}

function resolveStandaloneWithdrawalStart(input: PlannerInput) {
  if (input.retirementStartingBalance > 0) {
    return input.retirementStartingBalance;
  }

  return input.initialBalance;
}

function solveMaxSustainableMonthlyWithdrawal(
  input: PlannerInput,
  startingBalance: number,
) {
  if (startingBalance <= 0) {
    return 0;
  }

  const monthlyPayload: PlannerInput = {
    ...input,
    withdrawalAmount: 0,
    withdrawalFrequency: "monthly",
  };

  let low = 0;
  let high = Math.max(startingBalance / 12, 1000);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const simulation = simulateWithdrawal(monthlyPayload, startingBalance, high);

    if (simulation.rawEndingBalance <= 0) {
      break;
    }

    high *= 2;
  }

  for (let iteration = 0; iteration < 36; iteration += 1) {
    const mid = (low + high) / 2;
    const simulation = simulateWithdrawal(monthlyPayload, startingBalance, mid);

    if (simulation.rawEndingBalance > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return roundMoney(low);
}

export function calculateWithdrawal(
  input: PlannerInput,
  startingBalance = resolveStandaloneWithdrawalStart(input),
): WithdrawalResult {
  return simulateWithdrawal(input, startingBalance).result;
}

function simulateWithdrawal(
  input: PlannerInput,
  startingBalance = resolveStandaloneWithdrawalStart(input),
  initialWithdrawalAmount = input.withdrawalAmount,
): WithdrawalSimulation {
  const totalMonths = (input.lifeExpectancy - input.retirementAge) * 12;
  const compounding = compoundingIntervals[input.compoundingFrequency];
  const withdrawalInterval = withdrawalIntervals[input.withdrawalFrequency];
  const withdrawalGrowthRate = yearlyWithdrawalBump(input);
  const maxSimulationMonths =
    initialWithdrawalAmount > 0 &&
    withdrawalGrowthRate <= input.annualReturnDuringRetirement
      ? 600 * 12
      : totalMonths;

  let age = input.retirementAge;
  let balance = startingBalance;
  let rawBalance = startingBalance;
  let totalGrowth = 0;
  let totalWithdrawals = 0;
  let withdrawalAmount = initialWithdrawalAmount;
  let depletionAge: number | null = null;
  let lastsForever = false;

  const timeline: TimelinePoint[] = [
    buildPoint(age, balance, 0, totalGrowth, totalWithdrawals),
  ];

  for (let month = 1; month <= maxSimulationMonths; month += 1) {
    const rawBalanceWasPositive = rawBalance > 0;
    const scheduledWithdrawalMonth = month % withdrawalInterval === 0;

    if (scheduledWithdrawalMonth) {
      rawBalance -= withdrawalAmount;

      if (balance > 0) {
        const actualWithdrawal = Math.min(balance, withdrawalAmount);
        balance -= actualWithdrawal;
        totalWithdrawals += actualWithdrawal;
      }
    }

    if (month % compounding.months === 0) {
      if (rawBalance > 0) {
        rawBalance +=
          rawBalance *
          (input.annualReturnDuringRetirement / compounding.rateDivisor);
      }

      if (balance > 0) {
        const growth =
          balance * (input.annualReturnDuringRetirement / compounding.rateDivisor);
        balance += growth;
        totalGrowth += growth;
      }
    }

    if (
      depletionAge === null &&
      rawBalance <= 0 &&
      (rawBalanceWasPositive || (scheduledWithdrawalMonth && withdrawalAmount > 0))
    ) {
      depletionAge = input.retirementAge + month / 12;
    }

    if (month % 12 === 0) {
      age += 1;
      if (month <= totalMonths) {
        timeline.push(buildPoint(age, balance, 0, totalGrowth, totalWithdrawals));
      }
      withdrawalAmount *= 1 + withdrawalGrowthRate;
    }

    if (
      month > totalMonths &&
      depletionAge === null &&
      withdrawalGrowthRate <= input.annualReturnDuringRetirement &&
      rawBalance > startingBalance
    ) {
      lastsForever = true;
      break;
    }

    if (depletionAge !== null) {
      break;
    }
  }

  if (
    depletionAge === null &&
    initialWithdrawalAmount > 0 &&
    withdrawalGrowthRate <= input.annualReturnDuringRetirement &&
    maxSimulationMonths > totalMonths &&
    rawBalance > 0
  ) {
    lastsForever = true;
  }

  return {
    rawEndingBalance: roundMoney(rawBalance),
    result: {
      startingBalance: roundMoney(startingBalance),
      endingBalance: roundMoney(balance),
      lastsForever,
      totalWithdrawals: roundMoney(totalWithdrawals),
      yearsCovered:
        depletionAge !== null
          ? roundMoney(depletionAge - input.retirementAge)
          : totalMonths / 12,
      depletionAge: depletionAge ? roundMoney(depletionAge) : null,
      sustainableThroughLifeExpectancy:
        depletionAge === null || depletionAge >= input.lifeExpectancy,
      timeline,
    },
  };
}

export function calculateJourney(input: PlannerInput): JourneyResult {
  const accumulation = calculateAccumulation(input);
  const withdrawalSimulation = simulateWithdrawal(
    input,
    accumulation.retirementBalance,
  );

  return {
    accumulation,
    maxSustainableMonthlyWithdrawal: solveMaxSustainableMonthlyWithdrawal(
      input,
      accumulation.retirementBalance,
    ),
    withdrawal: withdrawalSimulation.result,
    shortfallOrSurplus: withdrawalSimulation.rawEndingBalance,
    timeline: [
      ...accumulation.timeline.slice(0, -1),
      ...withdrawalSimulation.result.timeline,
    ],
  };
}

export function calculatePlannerResultSet(input: PlannerInput): PlannerResultSet {
  const accumulation = calculateAccumulation(input);
  const standaloneWithdrawal = calculateWithdrawal(input);
  const journeyWithdrawalSimulation = simulateWithdrawal(
    input,
    accumulation.retirementBalance,
  );

  return {
    accumulation,
    standaloneWithdrawal,
    journey: {
      accumulation,
      maxSustainableMonthlyWithdrawal: solveMaxSustainableMonthlyWithdrawal(
        input,
        accumulation.retirementBalance,
      ),
      withdrawal: journeyWithdrawalSimulation.result,
      shortfallOrSurplus: journeyWithdrawalSimulation.rawEndingBalance,
      timeline: [
        ...accumulation.timeline.slice(0, -1),
        ...journeyWithdrawalSimulation.result.timeline,
      ],
    },
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
