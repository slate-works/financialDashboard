/**
 * Financial Analytics Types
 * Matches the backend analytics engine output
 */

/** Confidence level for metrics */
export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient"

/** Data completeness assessment */
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

/** A metric with its definition, value, and validity information */
export interface AnalyticsMetric<T = number | null> {
  id: string
  name: string
  value: T
  displayValue: string
  isValid: boolean
  confidence: ConfidenceLevel
  definition: string
  formula: string
  interpretation: string
  rawData: Record<string, number>
  requirements: string[]
  invalidReason?: string
  benchmark?: {
    low: number
    target: number
    high: number
    unit: string
  }
}

/** Trend analysis for a metric over time */
export interface TrendAnalysis {
  direction: "increasing" | "decreasing" | "stable" | "volatile" | "insufficient"
  changePercent: number | null
  rollingAvg3Month: number | null
  rollingAvg6Month: number | null
  standardDeviation: number | null
  coefficientOfVariation: number | null
  monthlyValues: Array<{ month: string; value: number }>
  explanation: string
  confidence: ConfidenceLevel
}

/** Complete analytics response */
export interface FinancialAnalytics {
  period: {
    start: string
    end: string
    months: number
  }
  dataCompleteness: DataCompleteness
  metrics: {
    savingsRate: AnalyticsMetric<number | null>
    budgetAdherence: AnalyticsMetric<number | null>
    netCashFlow: AnalyticsMetric<number | null>
    incomeStability: AnalyticsMetric<number | null>
    expenseVolatility: AnalyticsMetric<number | null>
  }
  trends: {
    income: TrendAnalysis
    expenses: TrendAnalysis
    netCashFlow: TrendAnalysis
    savingsRate: TrendAnalysis
  }
  categoryAnalysis: {
    topExpenseCategories: Array<{
      category: string
      amount: number
      percentOfTotal: number
      monthOverMonthChange: number | null
      isVolatile: boolean
    }>
    fixedVsVariable: {
      fixedEstimate: number
      variableEstimate: number
      ratio: number
      explanation: string
    }
  }
  insights: Array<{
    type: "info" | "warning" | "success" | "error"
    title: string
    message: string
    metric?: string
    isStatisticallySignificant: boolean
  }>
  goalTracking: {
    isEvaluable: boolean
    reason: string
    savingsGoalProgress: number | null
    daysRemainingInMonth: number
    projectedMonthEnd: {
      income: number | null
      expenses: number | null
      savings: number | null
    } | null
  }
  analyzedAt: string
}
