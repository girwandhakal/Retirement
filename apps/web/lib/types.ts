import { z } from "zod";

export const compoundingFrequencies = [
  "monthly",
  "quarterly",
  "annual",
] as const;

export const withdrawalFrequencies = [
  "monthly",
  "quarterly",
  "annual",
] as const;

export const plannerModes = ["save", "withdraw", "journey"] as const;

export const plannerInputSchema = z
  .object({
    currentAge: z.number().int().min(18).max(85),
    retirementAge: z.number().int().min(40).max(85),
    lifeExpectancy: z.number().int().min(60).max(110),
    initialBalance: z.number().min(0),
    retirementStartingBalance: z.number().min(0),
    retirementGoal: z.number().min(0).max(50_000_000),
    monthlyContribution: z.number().min(0),
    annualReturnBeforeRetirement: z.number().min(0).max(0.2),
    annualReturnDuringRetirement: z.number().min(0).max(0.2),
    compoundingFrequency: z.enum(compoundingFrequencies),
    annualContributionGrowthRate: z.number().min(0).max(0.1),
    withdrawalAmount: z.number().min(0),
    withdrawalFrequency: z.enum(withdrawalFrequencies),
    inflationRate: z.number().min(0).max(0.1),
    annualWithdrawalIncrease: z.number().min(0).max(0.1),
  })
  .refine((value) => value.retirementAge > value.currentAge, {
    message: "Retirement age must be greater than current age.",
    path: ["retirementAge"],
  })
  .refine((value) => value.lifeExpectancy > value.retirementAge, {
    message: "Life expectancy should be later than retirement age.",
    path: ["lifeExpectancy"],
  });

export type PlannerInput = z.infer<typeof plannerInputSchema>;
export type PlannerMode = (typeof plannerModes)[number];

export type TimelinePoint = {
  age: number;
  balance: number;
  contributions: number;
  growth: number;
  withdrawals: number;
};

export type AccumulationResult = {
  additionalMonthlyContributionNeeded: number;
  canReachGoal: boolean;
  goalFundingRatio: number;
  goalGap: number;
  monthlyIncomeEstimate: number;
  requiredMonthlyContribution: number;
  retirementBalance: number;
  timeline: TimelinePoint[];
  totalContributions: number;
  totalGrowth: number;
  yearsToRetirement: number;
};

export type WithdrawalResult = {
  depletionAge: number | null;
  endingBalance: number;
  lastsForever: boolean;
  startingBalance: number;
  sustainableThroughLifeExpectancy: boolean;
  timeline: TimelinePoint[];
  totalWithdrawals: number;
  yearsCovered: number;
};

export type JourneyResult = {
  accumulation: AccumulationResult;
  maxSustainableMonthlyWithdrawal: number;
  shortfallOrSurplus: number;
  timeline: TimelinePoint[];
  withdrawal: WithdrawalResult;
};

export type PlannerResultSet = {
  accumulation: AccumulationResult;
  journey: JourneyResult;
  standaloneWithdrawal: WithdrawalResult;
};

export const defaultPlannerInput: PlannerInput = {
  currentAge: 35,
  retirementAge: 65,
  lifeExpectancy: 92,
  initialBalance: 125000,
  retirementStartingBalance: 0,
  retirementGoal: 1500000,
  monthlyContribution: 1200,
  annualReturnBeforeRetirement: 0.07,
  annualReturnDuringRetirement: 0.05,
  compoundingFrequency: "monthly",
  annualContributionGrowthRate: 0.03,
  withdrawalAmount: 6500,
  withdrawalFrequency: "monthly",
  inflationRate: 0.025,
  annualWithdrawalIncrease: 0.02,
};
