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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

export function coercePlannerInput(raw: Partial<PlannerInput>) {
  const parsed = plannerInputSchema.safeParse({
    ...defaultPlannerInput,
    ...raw,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return defaultPlannerInput;
}

export function calculateAccumulation(input: PlannerInput): AccumulationResult {
  const yearsToRetirement = input.retirementAge - input.currentAge;
  const totalMonths = yearsToRetirement * 12;
  const interval = compoundingIntervals[input.compoundingFrequency];

  let age = input.currentAge;
  let balance = input.initialBalance;
  let totalContributions = input.initialBalance;
  let totalGrowth = 0;
  let monthlyContribution = input.monthlyContribution;

  const timeline: TimelinePoint[] = [
    buildPoint(age, balance, totalContributions, totalGrowth, 0),
  ];

  for (let month = 1; month <= totalMonths; month += 1) {
    balance += monthlyContribution;
    totalContributions += monthlyContribution;

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
      monthlyContribution *= 1 + input.annualContributionGrowthRate;
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

function resolveStandaloneWithdrawalStart(input: PlannerInput) {
  return input.retirementStartingBalance > 0
    ? input.retirementStartingBalance
    : input.initialBalance;
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
      ? depletionAge - input.retirementAge
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
