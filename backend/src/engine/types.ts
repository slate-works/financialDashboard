/**
 * Financial Analytics Engine - Type Definitions
 * 
 * Shared types used across all engine modules.
 */

// ============================================================================
// CONFIDENCE & DATA QUALITY
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'

export interface DataCompleteness {
  transactionCoverage: number
  hasIncomeData: boolean
  hasExpenseData: boolean
  categoryCount: number
  daysWithData: number
  totalDays: number
  confidence: ConfidenceLevel
  explanation: string
  warnings: string[]
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface TransactionInput {
  id: number
  date: Date
  description: string
  category: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  account?: string | null
  note?: string | null
}

export interface MonthlyAggregate {
  month: string // YYYY-MM format
  income: number
  expenses: number
  net: number
  savingsRate: number
  transactionCount: number
}

// ============================================================================
// BUDGET VARIANCE (Feature #1)
// ============================================================================

export type VarianceStatus = 'On Track' | 'Over Budget' | 'Under Budget'

export interface BudgetVarianceResult {
  category: string
  budgeted: number
  actual: number
  variance: number // (actual - budget) / budget * 100
  varianceAmount: number // actual - budget
  status: VarianceStatus
  isRedFlag: boolean
}

export interface MonthlyBudgetReport {
  month: string
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  surplus: number // income - expenses
  categories: BudgetVarianceResult[]
  redFlagCount: number
}

// ============================================================================
// RECURRING DETECTION (Feature #2)
// ============================================================================

export type RecurringPeriod = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'Unknown'
export type RecurringStatus = 'Confirmed' | 'Unconfirmed' | 'Archived'

export interface RecurringPatternResult {
  merchant: string
  category: string
  avgAmount: number
  period: RecurringPeriod
  confidence: number // 0-100
  status: RecurringStatus
  lastOccurrenceDate: Date
  nextExpectedDate: Date
  occurrences: number
  transactions: TransactionInput[]
}

// ============================================================================
// EXPENSE FORECASTING (Feature #3)
// ============================================================================

export interface ForecastResult {
  category: string
  forecast: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  confidence: ConfidenceLevel
  trend: 'increasing' | 'decreasing' | 'stable'
  monthlyHistory: Array<{ month: string; amount: number }>
  method: 'exponential_smoothing' | 'simple_average' | 'insufficient_data'
}

// ============================================================================
// CASH FLOW STABILITY (Feature #4)
// ============================================================================

export type StabilityRating = 'Very Stable' | 'Stable' | 'Moderate' | 'Volatile'

export interface CashFlowStabilityResult {
  stabilityIndex: number // 0-100
  rating: StabilityRating
  coefficientOfVariation: number | null
  meanNetCashFlow: number
  stdDevNetCashFlow: number
  recurringRatio: number // % of expenses that are recurring
  probabilityNegative3Months: number | null // probability of negative CF in next 3 months
  confidence: ConfidenceLevel
  explanation: string
}

// ============================================================================
// ANOMALY DETECTION (Feature #5)
// ============================================================================

export type AnomalyAction = 'review' | 'flag_in_ui' | 'none'
export type AnomalyReason = 
  | 'amount_outlier'
  | 'amount_extreme_outlier'
  | 'merchant_new'
  | 'duplicate_detected'
  | 'frequency_outlier'
  | 'normal'
  | 'insufficient_history'

export interface AnomalyResult {
  anomalyScore: number // 0-100
  reason: AnomalyReason
  action: AnomalyAction
  zScore: number | null
  expectedRange: [number, number] | null
  explanation: string
}

// ============================================================================
// RUNWAY & BURN RATE (Feature #6)
// ============================================================================

export type RunwayStatus = 'critical' | 'caution' | 'adequate' | 'comfortable' | 'surplus'

export interface RunwayScenario {
  name: string
  runwayMonths: number | null // null = infinite (surplus)
  status: RunwayStatus
  burnRate: number
  depletionDate: Date | null
}

export interface RunwayResult {
  cashOnHand: number
  grossBurnRate: number
  netBurnRate: number
  scenarios: {
    base: RunwayScenario
    conservative: RunwayScenario
    best: RunwayScenario
  }
  burnTrend: 'accelerating' | 'stable' | 'improving'
  recommendation: string
}

// ============================================================================
// SAVINGS & GOALS (Feature #7)
// ============================================================================

export type GoalStatus = 'on_track' | 'off_track' | 'achieved' | 'overdue'

export interface GoalProgressResult {
  goalId: number
  name: string
  targetAmount: number
  currentSaved: number
  progressPercent: number
  monthlyAllocation: number
  monthsToCompletion: number | null
  projectedCompletionDate: Date | null
  status: GoalStatus
  monthsOverdue: number | null
}

export interface SavingsAnalysis {
  savingsRate: number // percentage
  totalSavings: number
  monthlyAverageSavings: number
  goals: GoalProgressResult[]
  recommendation: string
}

// ============================================================================
// DEBT MANAGEMENT (Feature #8)
// ============================================================================

export type DTIStatus = 'Healthy' | 'Acceptable' | 'High Risk'
export type PayoffStrategy = 'avalanche' | 'snowball'

export interface DebtInput {
  id: number
  name: string
  principalAmount: number
  currentBalance: number
  annualInterestRate: number
  minMonthlyPayment: number
}

export interface PayoffScheduleResult {
  debtId: number
  name: string
  strategy: PayoffStrategy
  monthsToPayoff: number
  totalInterestPaid: number
  payoffDate: Date
  monthlyPayments: Array<{
    month: number
    payment: number
    principal: number
    interest: number
    remainingBalance: number
  }>
}

export interface DebtAnalysisResult {
  totalDebt: number
  totalMinPayment: number
  debtToIncome: number // DTI percentage
  dtiStatus: DTIStatus
  payoffComparison: {
    avalanche: {
      totalInterest: number
      totalMonths: number
      payoffDate: Date
    }
    snowball: {
      totalInterest: number
      totalMonths: number
      payoffDate: Date
    }
    interestSaved: number // avalanche vs snowball
  }
  recommendation: string
}

// ============================================================================
// BUDGET ADHERENCE (Feature #9)
// ============================================================================

export type AdherenceRating = 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'

export interface AdherenceHistoryEntry {
  month: string
  adherenceScore: number
  categoriesOnTrack: number
  totalCategories: number
}

export interface AdherenceAnalysisResult {
  overallScore: number // 0-100
  rating: AdherenceRating
  trend: 'improving' | 'stable' | 'declining' | 'insufficient'
  trendPercent: number | null
  history: AdherenceHistoryEntry[]
  problemCategories: Array<{
    category: string
    avgVariance: number
    timesOverBudget: number
    isConsistentOffender: boolean
  }>
  insights: string[]
}

// ============================================================================
// ADAPTIVE BUDGET (Feature #10)
// ============================================================================

export interface BudgetRecommendation {
  category: string
  currentBudget: number
  recommendedBudget: number
  changePercent: number
  reason: string
  confidence: ConfidenceLevel
  risk: string | null
}

export interface AdaptiveBudgetResult {
  recommendations: BudgetRecommendation[]
  totalCurrentBudget: number
  totalRecommendedBudget: number
  projectedSavingsImpact: number
  warnings: string[]
}

// ============================================================================
// INVESTMENT SIMULATOR (Feature #11)
// ============================================================================

export interface PortfolioInput {
  ticker: string
  shares: number
  currentPrice: number
}

export interface SimulationResult {
  mean: number
  stdDev: number
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  confidenceInterval: [number, number] // 10th to 90th
  probabilityOfGoal: number | null
  simulationsRun: number
  horizonMonths: number
  assumptions: string
}

// ============================================================================
// EMERGENCY FUND (Feature #12)
// ============================================================================

export type IncomeStabilityLevel = 'stable' | 'variable' | 'high_variable'
export type HealthRiskLevel = 'normal' | 'elevated' | 'high'
export type EmergencyFundStatus = 'below_target' | 'adequate' | 'above_target'

export interface EmergencyFundInput {
  incomeStability: IncomeStabilityLevel
  monthlyEssentialExpenses: number
  dependents: number
  healthRisk: HealthRiskLevel
  jobStabilityYears: number
  hasPartnerIncome: boolean
  currentBalance: number
}

export interface EmergencyFundResult {
  recommendedMonths: number
  recommendedRange: { min: number; max: number }
  recommendedAmount: number
  currentBalance: number
  status: EmergencyFundStatus
  actionNeeded: number // positive = build, negative = excess
  monthsToTarget: number | null
  rationale: string[]
}

// ============================================================================
// TREND ANALYSIS (Shared)
// ============================================================================

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'insufficient'

export interface TrendAnalysis {
  direction: TrendDirection
  changePercent: number | null
  rollingAvg3Month: number | null
  rollingAvg6Month: number | null
  standardDeviation: number | null
  coefficientOfVariation: number | null
  monthlyValues: Array<{ month: string; value: number }>
  explanation: string
  confidence: ConfidenceLevel
}
