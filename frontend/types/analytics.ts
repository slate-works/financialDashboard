/**
 * Frontend types for the comprehensive financial analytics engine
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'
export type TrendDirection = 'increasing' | 'decreasing' | 'stable'
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

// ============================================================================
// SAVINGS & INCOME ANALYSIS
// ============================================================================

export interface SavingsAnalysis {
  savingsRate: number
  rating: string
  trend: TrendDirection
  monthlyBreakdown: Array<{
    month: string
    income: number
    expenses: number
    savings: number
    rate: number
  }>
  incomeStability: {
    cv: number
    rating: string
    explanation: string
  }
  recommendations: string[]
}

// ============================================================================
// RECURRING DETECTION
// ============================================================================

export interface RecurringPattern {
  merchant: string
  category: string
  avgAmount: number
  period: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Annual'
  confidence: number
  status: 'Confirmed' | 'Unconfirmed' | 'Archived'
  lastOccurrenceDate: string
  nextExpectedDate: string
  occurrences: number
  transactionIds: number[]
}

export interface RecurringAnalysis {
  patterns: RecurringPattern[]
  totals: {
    weekly: number
    monthly: number
    annual: number
  }
  confirmedCount: number
  unconfirmedCount: number
}

// ============================================================================
// EXPENSE FORECASTING
// ============================================================================

export interface ExpenseForecast {
  forecast: number
  lowerBound: number
  upperBound: number
  confidence: ConfidenceLevel
  trend: TrendDirection
  method: string
  historicalData: Array<{ month: string; amount: number }>
}

export interface CategoryForecast extends ExpenseForecast {
  category: string
}

// ============================================================================
// CASH FLOW STABILITY
// ============================================================================

export interface CashFlowStability {
  stabilityIndex: number
  rating: string
  cv: number
  probabilityNegative: number
  volatilitySources: Array<{
    category: string
    contribution: number
    cv: number
  }>
  explanation: string
  confidence: ConfidenceLevel
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export interface Anomaly {
  transactionId: number
  transaction: {
    id: number
    date: string
    description: string
    category: string
    amount: number
    type: string
  }
  anomalyScore: number
  reasons: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface AnomalySummary {
  totalChecked: number
  flaggedCount: number
  highSeverityCount: number
  byCategory: Record<string, number>
  potentialSavings: number
}

export interface AnomalyAnalysis {
  anomalies: Anomaly[]
  summary: AnomalySummary
}

// ============================================================================
// RUNWAY & BURN RATE
// ============================================================================

export interface RunwayAnalysis {
  cashOnHand: number
  grossBurnRate: number
  netBurnRate: number
  scenarios: {
    base: {
      runwayMonths: number | null
      depletionDate: string | null
      status: string
    }
    optimistic: {
      runwayMonths: number | null
      depletionDate: string | null
      status: string
    }
    pessimistic: {
      runwayMonths: number | null
      depletionDate: string | null
      status: string
    }
  }
  burnTrend: TrendDirection
  recommendation: string
}

// ============================================================================
// BUDGET ADHERENCE
// ============================================================================

export interface CategoryAdherence {
  category: string
  budgeted: number
  actual: number
  variance: number
  variancePercent: number
  adherenceScore: number
  trend: TrendDirection
  status: 'under' | 'on-track' | 'over' | 'significantly-over'
}

export interface AdherenceAnalysis {
  overallScore: number
  rating: string
  trend: TrendDirection
  categories: CategoryAdherence[]
  problemCategories: string[]
  insights: string[]
}

// ============================================================================
// ADAPTIVE BUDGET
// ============================================================================

export interface BudgetRecommendation {
  category: string
  currentBudget: number | null
  recommendedBudget: number
  confidence: ConfidenceLevel
  reasoning: string
  trend: TrendDirection
  priority: 'high' | 'medium' | 'low'
}

export interface AdaptiveBudgetAnalysis {
  recommendations: BudgetRecommendation[]
  quickWins: Array<{
    category: string
    currentAvg: number
    targetAmount: number
    potentialSavings: number
    difficulty: 'easy' | 'moderate' | 'hard'
  }>
  totalPotentialSavings: number
}

// ============================================================================
// DEBT MANAGEMENT
// ============================================================================

export interface DebtAccount {
  id: number
  name: string
  principalAmount: number
  currentBalance: number
  annualInterestRate: number
  minMonthlyPayment: number
  dueDayOfMonth: number
}

export interface PayoffStrategy {
  name: string
  totalInterest: number
  totalPayments: number
  payoffMonths: number
  payoffDate: string
  schedule: Array<{
    month: number
    payment: number
    principal: number
    interest: number
    balance: number
  }>
}

export interface DebtAnalysis {
  totalDebt: number
  totalMinPayments: number
  dti: number
  dtiStatus: string
  dtiRecommendation: string
  strategies: {
    avalanche: PayoffStrategy
    snowball: PayoffStrategy
  }
  recommendation: string
}

// ============================================================================
// SAVINGS GOALS
// ============================================================================

export interface Goal {
  id: number
  name: string
  description?: string
  targetAmount: number
  currentSaved: number
  targetDate: string
  priority: number
  category?: string
  status: 'active' | 'completed' | 'archived'
}

export interface GoalProgress {
  goal: Goal
  progressPercent: number
  monthsRemaining: number
  requiredMonthly: number
  isOnTrack: boolean
  projectedCompletion: string | null
  status: 'ahead' | 'on-track' | 'behind' | 'at-risk'
}

export interface GoalsAnalysis {
  goals: GoalProgress[]
  totalTargetAmount: number
  totalSaved: number
  overallProgress: number
  monthlySavingsNeeded: number
  insights: string[]
}

// ============================================================================
// INVESTMENT SIMULATOR
// ============================================================================

export interface SimulationResult {
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
  probabilityOfSuccess: number
  expectedValue: number
  projectedPath: Array<{ month: number; median: number; p10: number; p90: number }>
}

export interface ScenarioComparison {
  conservative: SimulationResult
  moderate: SimulationResult
  aggressive: SimulationResult
}

// ============================================================================
// EMERGENCY FUND
// ============================================================================

export interface EmergencyFundAnalysis {
  recommendedMonths: number
  recommendedAmount: number
  currentBalance: number
  coverageMonths: number
  status: 'below_target' | 'adequate' | 'above_target'
  statusExplanation: string
  monthlyEssentialExpenses: number
  factors: {
    incomeStability: string
    dependents: number
    healthRisk: string
    jobStabilityYears: number
    hasPartnerIncome: boolean
  }
}

// ============================================================================
// ACTIONABLE INSIGHTS
// ============================================================================

export interface Insight {
  id: string
  type: 'positive' | 'warning' | 'alert' | 'tip' | 'achievement'
  category: string
  title: string
  message: string
  action?: string
  impact?: number
  priority: number
}

export interface InsightsAnalysis {
  insights: Insight[]
  topPriority: Insight | null
  categoryCounts: Record<string, number>
}

// ============================================================================
// COMPREHENSIVE DASHBOARD
// ============================================================================

export interface ComprehensiveAnalytics {
  lastUpdated: string
  dataQuality: {
    transactionCount: number
    monthsOfData: number
    categories: number
    hasIncome: boolean
    hasExpenses: boolean
  }
  savings: SavingsAnalysis
  stability: CashFlowStability
  runway: RunwayAnalysis
  forecast: ExpenseForecast
  recurring: RecurringAnalysis
  anomalies: AnomalyAnalysis
  adherence: AdherenceAnalysis | null
  adaptiveBudget: AdaptiveBudgetAnalysis
  debt: DebtAnalysis | null
  goals: GoalsAnalysis | null
  emergencyFund: EmergencyFundAnalysis | null
  insights: InsightsAnalysis
}
