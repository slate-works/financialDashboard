/**
 * Financial Analytics Engine
 * 
 * Provides statistically sound, interpretable financial metrics with:
 * - Clear definitions and formulas
 * - Data completeness validation
 * - Confidence scoring
 * - Trend analysis
 * - Conservative interpretation (prefer "unknown" over "wrong")
 */

import { prisma } from "../db/index.js"
import type { Transaction } from "@prisma/client"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Confidence level for metrics */
export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient"

/** Data completeness assessment */
export interface DataCompleteness {
  /** Percentage of days in period with transactions (0-100) */
  transactionCoverage: number
  /** Whether income records exist for the period */
  hasIncomeData: boolean
  /** Whether expense records exist for the period */
  hasExpenseData: boolean
  /** Number of unique categories tracked */
  categoryCount: number
  /** Days with data / total days in period */
  daysWithData: number
  /** Total days in the analysis period */
  totalDays: number
  /** Overall confidence level */
  confidence: ConfidenceLevel
  /** Human-readable explanation of data state */
  explanation: string
  /** List of potential data gaps */
  warnings: string[]
}

/** A metric with its definition, value, and validity information */
export interface AnalyticsMetric<T = number | null> {
  /** Unique identifier for the metric */
  id: string
  /** Display name */
  name: string
  /** Current computed value (null if invalid/insufficient data) */
  value: T
  /** Formatted display value */
  displayValue: string
  /** Whether the metric is valid/reliable */
  isValid: boolean
  /** Confidence level */
  confidence: ConfidenceLevel
  /** Plain-English definition */
  definition: string
  /** Formula used to calculate */
  formula: string
  /** What the metric means in context */
  interpretation: string
  /** Raw numbers behind the metric */
  rawData: Record<string, number>
  /** Requirements for validity */
  requirements: string[]
  /** Why the metric may be invalid (if applicable) */
  invalidReason?: string
  /** Benchmark/target range if applicable */
  benchmark?: {
    low: number
    target: number
    high: number
    unit: string
  }
}

/** Trend analysis for a metric over time */
export interface TrendAnalysis {
  /** Direction of trend */
  direction: "increasing" | "decreasing" | "stable" | "volatile" | "insufficient"
  /** Percentage change */
  changePercent: number | null
  /** 3-month rolling average */
  rollingAvg3Month: number | null
  /** 6-month rolling average */
  rollingAvg6Month: number | null
  /** Standard deviation (volatility) */
  standardDeviation: number | null
  /** Coefficient of variation (volatility as % of mean) */
  coefficientOfVariation: number | null
  /** Monthly data points */
  monthlyValues: Array<{ month: string; value: number }>
  /** Human-readable trend explanation */
  explanation: string
  /** Confidence in the trend assessment */
  confidence: ConfidenceLevel
}

/** Complete analytics response */
export interface FinancialAnalytics {
  /** Period analyzed */
  period: {
    start: string
    end: string
    months: number
  }
  /** Data completeness assessment */
  dataCompleteness: DataCompleteness
  /** Core financial metrics */
  metrics: {
    savingsRate: AnalyticsMetric<number | null>
    budgetAdherence: AnalyticsMetric<number | null>
    netCashFlow: AnalyticsMetric<number | null>
    incomeStability: AnalyticsMetric<number | null>
    expenseVolatility: AnalyticsMetric<number | null>
  }
  /** Trend analyses */
  trends: {
    income: TrendAnalysis
    expenses: TrendAnalysis
    netCashFlow: TrendAnalysis
    savingsRate: TrendAnalysis
  }
  /** Category-level insights */
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
  /** Actionable interpretations */
  insights: Array<{
    type: "info" | "warning" | "success" | "error"
    title: string
    message: string
    metric?: string
    isStatisticallySignificant: boolean
  }>
  /** Monthly goal tracking */
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
  /** Timestamp of analysis */
  analyzedAt: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum days of data required for reliable monthly analysis */
const MIN_DAYS_FOR_MONTHLY = 14

/** Minimum months of data for trend analysis */
const MIN_MONTHS_FOR_TREND = 3

/** Transaction coverage threshold for high confidence */
const HIGH_CONFIDENCE_COVERAGE = 0.7

/** Transaction coverage threshold for medium confidence */
const MEDIUM_CONFIDENCE_COVERAGE = 0.4

/** Coefficient of variation threshold for "volatile" classification */
const VOLATILITY_THRESHOLD = 0.3

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Calculate coefficient of variation (CV = stddev / mean)
 */
function calculateCV(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return null
  const stdDev = calculateStdDev(values)
  return stdDev / Math.abs(mean)
}

/**
 * Calculate rolling average for the last N items
 */
function calculateRollingAverage(values: number[], n: number): number | null {
  if (values.length < n) return null
  const lastN = values.slice(-n)
  return lastN.reduce((a, b) => a + b, 0) / n
}

/**
 * Format currency value
 */
function formatCurrency(value: number | null): string {
  if (value === null) return "--"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage value
 */
function formatPercent(value: number | null, decimals = 1): string {
  if (value === null) return "--"
  return `${value.toFixed(decimals)}%`
}

/**
 * Get month key from date (YYYY-MM)
 */
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Determine confidence level based on data completeness
 */
function determineConfidence(coverage: number, hasIncome: boolean, hasExpenses: boolean): ConfidenceLevel {
  if (coverage >= HIGH_CONFIDENCE_COVERAGE && hasIncome && hasExpenses) return "high"
  if (coverage >= MEDIUM_CONFIDENCE_COVERAGE && (hasIncome || hasExpenses)) return "medium"
  if (coverage > 0) return "low"
  return "insufficient"
}

// ============================================================================
// MAIN ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Assess data completeness for a given period
 */
export function assessDataCompleteness(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): DataCompleteness {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Get unique dates with transactions
  const datesWithData = new Set<string>()
  const categories = new Set<string>()
  let hasIncome = false
  let hasExpenses = false
  
  for (const t of transactions) {
    const tDate = new Date(t.date)
    if (tDate >= startDate && tDate <= endDate) {
      datesWithData.add(tDate.toISOString().split("T")[0])
      categories.add(t.category)
      if (t.type === "income") hasIncome = true
      if (t.type === "expense") hasExpenses = true
    }
  }
  
  const daysWithData = datesWithData.size
  const coverage = totalDays > 0 ? daysWithData / totalDays : 0
  const confidence = determineConfidence(coverage, hasIncome, hasExpenses)
  
  // Build warnings
  const warnings: string[] = []
  if (!hasIncome) {
    warnings.push("No income transactions recorded in this period")
  }
  if (!hasExpenses) {
    warnings.push("No expense transactions recorded in this period")
  }
  if (coverage < MEDIUM_CONFIDENCE_COVERAGE) {
    warnings.push(`Only ${(coverage * 100).toFixed(0)}% of days have transaction data`)
  }
  if (categories.size < 3) {
    warnings.push("Limited category diversity may indicate incomplete data")
  }
  
  // Build explanation
  let explanation: string
  if (confidence === "high") {
    explanation = `Good data coverage: ${daysWithData} of ${totalDays} days have transactions, with both income and expenses tracked.`
  } else if (confidence === "medium") {
    explanation = `Partial data coverage: ${daysWithData} of ${totalDays} days have transactions. Some metrics may be less reliable.`
  } else if (confidence === "low") {
    explanation = `Limited data: Only ${daysWithData} of ${totalDays} days have transactions. Metrics should be interpreted with caution.`
  } else {
    explanation = "Insufficient data to calculate reliable metrics for this period."
  }
  
  return {
    transactionCoverage: coverage * 100,
    hasIncomeData: hasIncome,
    hasExpenseData: hasExpenses,
    categoryCount: categories.size,
    daysWithData,
    totalDays,
    confidence,
    explanation,
    warnings,
  }
}

/**
 * Calculate savings rate with full context
 */
function calculateSavingsRateMetric(
  income: number,
  expenses: number,
  dataCompleteness: DataCompleteness
): AnalyticsMetric<number | null> {
  const id = "savings_rate"
  const name = "Savings Rate"
  const definition = "The percentage of income retained after all expenses. Measures how much of each dollar earned is being saved."
  const formula = "(Total Income - Total Expenses) / Total Income × 100"
  const requirements = [
    "Income must be greater than zero",
    "Transaction coverage should be at least 40% of the period",
    "Both income and expense data should exist",
  ]
  const benchmark = { low: 10, target: 20, high: 30, unit: "%" }
  
  // Validity checks
  const isIncomeValid = income > 0
  const isDataSufficient = dataCompleteness.confidence !== "insufficient"
  const hasRequiredData = dataCompleteness.hasIncomeData
  const isValid = isIncomeValid && isDataSufficient && hasRequiredData
  
  let value: number | null = null
  let displayValue = "--"
  let interpretation = ""
  let invalidReason: string | undefined
  
  if (!isIncomeValid) {
    invalidReason = "No income recorded. Savings rate requires income to calculate."
    interpretation = "Unable to calculate: no income data available."
  } else if (!isDataSufficient) {
    invalidReason = "Insufficient transaction data for reliable calculation."
    interpretation = "Unable to calculate: not enough data points."
  } else {
    value = ((income - expenses) / income) * 100
    displayValue = formatPercent(value)
    
    if (value >= 30) {
      interpretation = `Excellent: You're saving ${formatPercent(value)} of income. This exceeds the recommended 20% target.`
    } else if (value >= 20) {
      interpretation = `Good: You're saving ${formatPercent(value)} of income, meeting the recommended target.`
    } else if (value >= 10) {
      interpretation = `Moderate: You're saving ${formatPercent(value)} of income. Consider reducing expenses to reach 20%.`
    } else if (value >= 0) {
      interpretation = `Low: Only ${formatPercent(value)} of income is being saved. Review discretionary spending.`
    } else {
      interpretation = `Negative: Spending exceeds income by ${formatPercent(Math.abs(value))}. Immediate attention needed.`
    }
    
    if (dataCompleteness.confidence === "low") {
      interpretation += " (Note: Limited data may affect accuracy)"
    }
  }
  
  return {
    id,
    name,
    value,
    displayValue,
    isValid,
    confidence: isValid ? dataCompleteness.confidence : "insufficient",
    definition,
    formula,
    interpretation,
    rawData: { income, expenses, net: income - expenses },
    requirements,
    invalidReason,
    benchmark,
  }
}

/**
 * Calculate budget adherence metric
 * Budget adherence = how well spending stays within expected limits
 */
function calculateBudgetAdherenceMetric(
  income: number,
  expenses: number,
  dataCompleteness: DataCompleteness,
  targetSpendRatio = 0.80 // 80% of income as default spend target
): AnalyticsMetric<number | null> {
  const id = "budget_adherence"
  const name = "Budget Adherence"
  const definition = "How well actual spending aligns with the target spending budget (default: 80% of income). Values over 100% indicate overspending."
  const formula = "(Target Budget / Actual Expenses) × 100, where Target Budget = Income × Target Ratio"
  const requirements = [
    "Income must be greater than zero",
    "Expense data must exist",
    "Transaction coverage should be at least 40%",
  ]
  
  const isIncomeValid = income > 0
  const isDataSufficient = dataCompleteness.confidence !== "insufficient"
  const hasExpenses = dataCompleteness.hasExpenseData
  const isValid = isIncomeValid && isDataSufficient && hasExpenses
  
  let value: number | null = null
  let displayValue = "--"
  let interpretation = ""
  let invalidReason: string | undefined
  
  const targetBudget = income * targetSpendRatio
  
  if (!isIncomeValid) {
    invalidReason = "No income recorded. Cannot establish budget baseline."
    interpretation = "Unable to calculate: income data required to set budget target."
  } else if (!hasExpenses) {
    invalidReason = "No expense data recorded."
    interpretation = "Unable to calculate: no expense data available."
  } else if (!isDataSufficient) {
    invalidReason = "Insufficient transaction data."
    interpretation = "Unable to calculate: not enough data points."
  } else {
    // Calculate: if expenses < target, adherence > 100 (good)
    // if expenses > target, adherence < 100 (over budget)
    value = expenses > 0 ? (targetBudget / expenses) * 100 : 100
    displayValue = formatPercent(value, 0)
    
    const overUnder = expenses - targetBudget
    const overUnderFormatted = formatCurrency(Math.abs(overUnder))
    
    if (value >= 100) {
      interpretation = `On track: Spending is ${overUnderFormatted} under the ${formatPercent(targetSpendRatio * 100, 0)} income target.`
    } else if (value >= 90) {
      interpretation = `Slightly over: Spending exceeds target by ${overUnderFormatted}. Minor adjustment may help.`
    } else if (value >= 80) {
      interpretation = `Over budget: Spending is ${overUnderFormatted} above target. Review largest expense categories.`
    } else {
      interpretation = `Significantly over: Spending exceeds target by ${overUnderFormatted}. Immediate review recommended.`
    }
    
    if (dataCompleteness.confidence === "low") {
      interpretation += " (Note: Limited data may affect accuracy)"
    }
  }
  
  return {
    id,
    name,
    value,
    displayValue,
    isValid,
    confidence: isValid ? dataCompleteness.confidence : "insufficient",
    definition,
    formula,
    interpretation,
    rawData: { 
      income, 
      expenses, 
      targetBudget, 
      targetRatio: targetSpendRatio * 100,
      variance: targetBudget - expenses 
    },
    requirements,
    invalidReason,
  }
}

/**
 * Calculate income stability metric (based on coefficient of variation)
 */
function calculateIncomeStabilityMetric(
  monthlyIncomes: number[]
): AnalyticsMetric<number | null> {
  const id = "income_stability"
  const name = "Income Stability"
  const definition = "Measures how consistent income is month-to-month. Higher scores indicate more predictable income."
  const formula = "100 - (Standard Deviation of Monthly Income / Average Monthly Income × 100)"
  const requirements = [
    "At least 3 months of income data",
    "Income must exist in the data",
  ]
  
  const hasEnoughData = monthlyIncomes.length >= MIN_MONTHS_FOR_TREND
  const hasIncome = monthlyIncomes.some(v => v > 0)
  const isValid = hasEnoughData && hasIncome
  
  let value: number | null = null
  let displayValue = "--"
  let interpretation = ""
  let invalidReason: string | undefined
  let confidence: ConfidenceLevel = "insufficient"
  
  if (!hasEnoughData) {
    invalidReason = `Only ${monthlyIncomes.length} months of data. Need at least ${MIN_MONTHS_FOR_TREND} months for stability analysis.`
    interpretation = "Insufficient history for stability analysis."
  } else if (!hasIncome) {
    invalidReason = "No income recorded in the analysis period."
    interpretation = "Unable to assess stability without income data."
  } else {
    const cv = calculateCV(monthlyIncomes)
    if (cv !== null) {
      // Convert CV to a 0-100 stability score (lower CV = higher stability)
      value = Math.max(0, Math.min(100, 100 - cv * 100))
      displayValue = formatPercent(value, 0)
      confidence = monthlyIncomes.length >= 6 ? "high" : "medium"
      
      if (value >= 90) {
        interpretation = "Very stable: Income is highly consistent month-to-month."
      } else if (value >= 70) {
        interpretation = "Stable: Income shows minor variations but is generally predictable."
      } else if (value >= 50) {
        interpretation = "Moderate: Income has noticeable fluctuations. Consider building a larger emergency fund."
      } else {
        interpretation = "Variable: Income varies significantly. Budget conservatively using your lowest income months."
      }
    }
  }
  
  return {
    id,
    name,
    value,
    displayValue,
    isValid,
    confidence,
    definition,
    formula,
    interpretation,
    rawData: {
      monthCount: monthlyIncomes.length,
      average: monthlyIncomes.length > 0 
        ? monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length 
        : 0,
      stdDev: monthlyIncomes.length >= 2 ? calculateStdDev(monthlyIncomes) : 0,
    },
    requirements,
    invalidReason,
  }
}

/**
 * Calculate expense volatility metric
 */
function calculateExpenseVolatilityMetric(
  monthlyExpenses: number[]
): AnalyticsMetric<number | null> {
  const id = "expense_volatility"
  const name = "Expense Volatility"
  const definition = "Measures how much expenses fluctuate month-to-month. Lower values indicate more predictable spending."
  const formula = "Coefficient of Variation = Standard Deviation / Average × 100"
  const requirements = [
    "At least 3 months of expense data",
    "Expenses must exist in the data",
  ]
  
  const hasEnoughData = monthlyExpenses.length >= MIN_MONTHS_FOR_TREND
  const hasExpenses = monthlyExpenses.some(v => v > 0)
  const isValid = hasEnoughData && hasExpenses
  
  let value: number | null = null
  let displayValue = "--"
  let interpretation = ""
  let invalidReason: string | undefined
  let confidence: ConfidenceLevel = "insufficient"
  
  if (!hasEnoughData) {
    invalidReason = `Only ${monthlyExpenses.length} months of data. Need at least ${MIN_MONTHS_FOR_TREND} months.`
    interpretation = "Insufficient history for volatility analysis."
  } else if (!hasExpenses) {
    invalidReason = "No expenses recorded in the analysis period."
    interpretation = "Unable to assess volatility without expense data."
  } else {
    const cv = calculateCV(monthlyExpenses)
    if (cv !== null) {
      value = cv * 100 // Express as percentage
      displayValue = formatPercent(value, 0)
      confidence = monthlyExpenses.length >= 6 ? "high" : "medium"
      
      if (value <= 15) {
        interpretation = "Very predictable: Expenses are highly consistent. Great for budgeting."
      } else if (value <= 30) {
        interpretation = "Normal: Expenses show typical variation. Budget should accommodate minor swings."
      } else if (value <= 50) {
        interpretation = "Elevated: Expenses vary more than typical. Consider identifying large one-time purchases."
      } else {
        interpretation = "High volatility: Spending is unpredictable. Review for irregular large expenses."
      }
    }
  }
  
  return {
    id,
    name,
    value,
    displayValue,
    isValid,
    confidence,
    definition,
    formula,
    interpretation,
    rawData: {
      monthCount: monthlyExpenses.length,
      average: monthlyExpenses.length > 0 
        ? monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length 
        : 0,
      stdDev: monthlyExpenses.length >= 2 ? calculateStdDev(monthlyExpenses) : 0,
    },
    requirements,
    invalidReason,
  }
}

/**
 * Analyze trend for a series of monthly values
 */
function analyzeTrend(
  monthlyData: Array<{ month: string; value: number }>
): TrendAnalysis {
  const values = monthlyData.map(d => d.value)
  const hasEnoughData = values.length >= MIN_MONTHS_FOR_TREND
  
  if (!hasEnoughData) {
    return {
      direction: "insufficient",
      changePercent: null,
      rollingAvg3Month: null,
      rollingAvg6Month: null,
      standardDeviation: null,
      coefficientOfVariation: null,
      monthlyValues: monthlyData,
      explanation: `Need at least ${MIN_MONTHS_FOR_TREND} months of data for trend analysis. Currently have ${values.length}.`,
      confidence: "insufficient",
    }
  }
  
  const stdDev = calculateStdDev(values)
  const cv = calculateCV(values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const rollingAvg3 = calculateRollingAverage(values, 3)
  const rollingAvg6 = calculateRollingAverage(values, 6)
  
  // Calculate trend direction using linear regression slope
  let direction: TrendAnalysis["direction"] = "stable"
  let changePercent: number | null = null
  
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    if (firstAvg > 0) {
      changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    }
    
    // Determine direction
    if (cv !== null && cv > VOLATILITY_THRESHOLD) {
      direction = "volatile"
    } else if (changePercent !== null) {
      if (changePercent > 10) direction = "increasing"
      else if (changePercent < -10) direction = "decreasing"
      else direction = "stable"
    }
  }
  
  // Build explanation
  let explanation: string
  switch (direction) {
    case "increasing":
      explanation = `Trending upward: ${formatPercent(changePercent)} change comparing recent months to earlier months.`
      break
    case "decreasing":
      explanation = `Trending downward: ${formatPercent(changePercent)} change comparing recent months to earlier months.`
      break
    case "volatile":
      explanation = `Highly variable: Values fluctuate significantly (CV: ${formatPercent(cv ? cv * 100 : null)}). Look for irregular large items.`
      break
    case "stable":
      explanation = `Relatively stable: Values remain consistent within normal variation.`
      break
    default:
      explanation = "Insufficient data for trend analysis."
  }
  
  return {
    direction,
    changePercent,
    rollingAvg3Month: rollingAvg3,
    rollingAvg6Month: rollingAvg6,
    standardDeviation: stdDev,
    coefficientOfVariation: cv,
    monthlyValues: monthlyData,
    explanation,
    confidence: values.length >= 6 ? "high" : "medium",
  }
}

/**
 * Analyze categories for fixed vs variable expense estimation
 */
function analyzeFixedVsVariable(
  transactions: Transaction[],
  monthlyData: Map<string, { expenses: number }>
): {
  fixedEstimate: number
  variableEstimate: number
  ratio: number
  explanation: string
} {
  // Categories typically considered "fixed"
  const fixedCategories = new Set([
    "Bills", "Rent", "Mortgage", "Insurance", "Subscriptions", 
    "Utilities", "Loan", "Debt", "Phone", "Internet"
  ])
  
  // Analyze category consistency across months
  const categoryMonthlyAmounts = new Map<string, number[]>()
  const categoryMonthCounts = new Map<string, Set<string>>()
  
  for (const t of transactions) {
    if (t.type !== "expense") continue
    
    const month = getMonthKey(new Date(t.date))
    const cat = t.category
    
    if (!categoryMonthlyAmounts.has(cat)) {
      categoryMonthlyAmounts.set(cat, [])
      categoryMonthCounts.set(cat, new Set())
    }
    
    categoryMonthCounts.get(cat)!.add(month)
  }
  
  // Calculate per-category monthly totals
  const expensesByCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== "expense") continue
    const current = expensesByCategory.get(t.category) || 0
    expensesByCategory.set(t.category, current + Math.abs(t.amount))
  }
  
  const totalMonths = monthlyData.size
  let fixedEstimate = 0
  let variableEstimate = 0
  
  for (const [cat, total] of expensesByCategory) {
    const monthsPresent = categoryMonthCounts.get(cat)?.size || 0
    const presenceRatio = totalMonths > 0 ? monthsPresent / totalMonths : 0
    
    // Consider "fixed" if: appears in most months OR is a known fixed category
    const isLikelyFixed = presenceRatio >= 0.75 || 
      Array.from(fixedCategories).some(fc => cat.toLowerCase().includes(fc.toLowerCase()))
    
    if (isLikelyFixed) {
      fixedEstimate += total / Math.max(totalMonths, 1)
    } else {
      variableEstimate += total / Math.max(totalMonths, 1)
    }
  }
  
  const totalMonthly = fixedEstimate + variableEstimate
  const ratio = totalMonthly > 0 ? fixedEstimate / totalMonthly : 0
  
  let explanation: string
  if (totalMonths < 2) {
    explanation = "Insufficient data to distinguish fixed from variable expenses."
  } else if (ratio > 0.7) {
    explanation = `Most spending (${formatPercent(ratio * 100, 0)}) appears to be recurring/fixed costs. Limited room for reduction without lifestyle changes.`
  } else if (ratio > 0.4) {
    explanation = `Balanced mix: ~${formatPercent(ratio * 100, 0)} fixed, ~${formatPercent((1-ratio) * 100, 0)} variable. Variable spending offers flexibility.`
  } else {
    explanation = `Most spending (${formatPercent((1-ratio) * 100, 0)}) is variable/discretionary. Good potential for adjustment if needed.`
  }
  
  return { fixedEstimate, variableEstimate, ratio, explanation }
}

/**
 * Generate actionable insights based on all metrics
 */
function generateInsights(
  metrics: FinancialAnalytics["metrics"],
  trends: FinancialAnalytics["trends"],
  dataCompleteness: DataCompleteness
): FinancialAnalytics["insights"] {
  const insights: FinancialAnalytics["insights"] = []
  
  // Data quality warning
  if (dataCompleteness.confidence === "low" || dataCompleteness.confidence === "insufficient") {
    insights.push({
      type: "warning",
      title: "Limited Data Available",
      message: dataCompleteness.explanation,
      isStatisticallySignificant: true,
    })
  }
  
  // Savings rate insights
  if (metrics.savingsRate.isValid && metrics.savingsRate.value !== null) {
    const rate = metrics.savingsRate.value
    if (rate < 0) {
      insights.push({
        type: "error",
        title: "Spending Exceeds Income",
        message: `You're spending more than you earn (${formatPercent(Math.abs(rate))} over). Review expenses immediately.`,
        metric: "savings_rate",
        isStatisticallySignificant: true,
      })
    } else if (rate < 10) {
      insights.push({
        type: "warning",
        title: "Low Savings Rate",
        message: `Current savings rate of ${formatPercent(rate)} is below recommended 15-20%. Consider reducing discretionary spending.`,
        metric: "savings_rate",
        isStatisticallySignificant: dataCompleteness.confidence === "high",
      })
    } else if (rate >= 20) {
      insights.push({
        type: "success",
        title: "Healthy Savings Rate",
        message: `${formatPercent(rate)} savings rate meets or exceeds the recommended target.`,
        metric: "savings_rate",
        isStatisticallySignificant: dataCompleteness.confidence === "high",
      })
    }
  }
  
  // Expense trend insight
  if (trends.expenses.direction === "increasing" && trends.expenses.confidence !== "insufficient") {
    insights.push({
      type: "warning",
      title: "Rising Expenses",
      message: `Expenses have increased ${formatPercent(Math.abs(trends.expenses.changePercent || 0))} over recent months. Review spending categories.`,
      metric: "expense_trend",
      isStatisticallySignificant: trends.expenses.confidence === "high",
    })
  }
  
  // Income stability insight
  if (metrics.incomeStability.isValid && metrics.incomeStability.value !== null) {
    if (metrics.incomeStability.value < 50) {
      insights.push({
        type: "info",
        title: "Variable Income Pattern",
        message: "Income varies significantly month-to-month. Consider budgeting based on your lowest income months.",
        metric: "income_stability",
        isStatisticallySignificant: true,
      })
    }
  }
  
  return insights
}

/**
 * Evaluate monthly goal tracking
 */
function evaluateGoalTracking(
  currentMonthData: { income: number; expenses: number; daysElapsed: number; totalDays: number },
  dataCompleteness: DataCompleteness
): FinancialAnalytics["goalTracking"] {
  const { income, expenses, daysElapsed, totalDays } = currentMonthData
  const daysRemaining = totalDays - daysElapsed
  const percentComplete = daysElapsed / totalDays
  
  // Require at least 40% of month complete and some data
  const isEvaluable = percentComplete >= 0.4 && 
    dataCompleteness.confidence !== "insufficient" &&
    (income > 0 || expenses > 0)
  
  if (!isEvaluable) {
    return {
      isEvaluable: false,
      reason: percentComplete < 0.4 
        ? `Month is only ${formatPercent(percentComplete * 100, 0)} complete. Wait for more data.`
        : "Insufficient transaction data this month for goal tracking.",
      savingsGoalProgress: null,
      daysRemainingInMonth: daysRemaining,
      projectedMonthEnd: null,
    }
  }
  
  // Project end-of-month based on current run rate
  const dailyIncomeRate = income / daysElapsed
  const dailyExpenseRate = expenses / daysElapsed
  
  const projectedIncome = income + (dailyIncomeRate * daysRemaining)
  const projectedExpenses = expenses + (dailyExpenseRate * daysRemaining)
  const projectedSavings = projectedIncome - projectedExpenses
  
  const savingsGoalProgress = projectedIncome > 0 
    ? (projectedSavings / projectedIncome) * 100 / 20 * 100 // vs 20% target
    : null
  
  return {
    isEvaluable: true,
    reason: "Sufficient data for goal tracking.",
    savingsGoalProgress,
    daysRemainingInMonth: daysRemaining,
    projectedMonthEnd: {
      income: projectedIncome,
      expenses: projectedExpenses,
      savings: projectedSavings,
    },
  }
}

// ============================================================================
// MAIN EXPORT: COMPUTE FULL ANALYTICS
// ============================================================================

/**
 * Compute comprehensive financial analytics
 */
export async function computeFinancialAnalytics(
  options: {
    /** Number of months to analyze (default: 6) */
    monthsToAnalyze?: number
  } = {}
): Promise<FinancialAnalytics> {
  const { monthsToAnalyze = 6 } = options
  
  // Fetch all transactions
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
  })
  
  // Determine analysis period
  const now = new Date()
  const endDate = now
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze + 1, 1)
  
  // Filter transactions to analysis period
  const periodTransactions = transactions.filter(t => {
    const d = new Date(t.date)
    return d >= startDate && d <= endDate
  })
  
  // Assess data completeness
  const dataCompleteness = assessDataCompleteness(periodTransactions, startDate, endDate)
  
  // Build monthly aggregates
  const monthlyData = new Map<string, { 
    income: number
    expenses: number
    net: number
    savingsRate: number 
  }>()
  
  for (const t of periodTransactions) {
    const month = getMonthKey(new Date(t.date))
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { income: 0, expenses: 0, net: 0, savingsRate: 0 })
    }
    const bucket = monthlyData.get(month)!
    if (t.type === "income") {
      bucket.income += Math.abs(t.amount)
    } else if (t.type === "expense") {
      bucket.expenses += Math.abs(t.amount)
    }
    bucket.net = bucket.income - bucket.expenses
    bucket.savingsRate = bucket.income > 0 ? (bucket.net / bucket.income) * 100 : 0
  }
  
  // Calculate totals for the period
  let totalIncome = 0
  let totalExpenses = 0
  for (const bucket of monthlyData.values()) {
    totalIncome += bucket.income
    totalExpenses += bucket.expenses
  }
  
  // Build monthly arrays for trend analysis
  const sortedMonths = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
  
  const monthlyIncomes = sortedMonths.map(([_, d]) => d.income)
  const monthlyExpenses = sortedMonths.map(([_, d]) => d.expenses)
  const monthlyNets = sortedMonths.map(([_, d]) => d.net)
  const monthlySavingsRates = sortedMonths.map(([_, d]) => d.savingsRate)
  
  // Calculate metrics
  const savingsRate = calculateSavingsRateMetric(totalIncome, totalExpenses, dataCompleteness)
  const budgetAdherence = calculateBudgetAdherenceMetric(totalIncome, totalExpenses, dataCompleteness)
  const incomeStability = calculateIncomeStabilityMetric(monthlyIncomes)
  const expenseVolatility = calculateExpenseVolatilityMetric(monthlyExpenses)
  
  // Net cash flow metric
  const netCashFlow: AnalyticsMetric<number | null> = {
    id: "net_cash_flow",
    name: "Net Cash Flow",
    value: dataCompleteness.confidence !== "insufficient" ? totalIncome - totalExpenses : null,
    displayValue: formatCurrency(totalIncome - totalExpenses),
    isValid: dataCompleteness.confidence !== "insufficient",
    confidence: dataCompleteness.confidence,
    definition: "Total income minus total expenses over the analysis period.",
    formula: "Sum of all income - Sum of all expenses",
    interpretation: totalIncome > totalExpenses 
      ? `Positive cash flow of ${formatCurrency(totalIncome - totalExpenses)} over the period.`
      : `Negative cash flow of ${formatCurrency(Math.abs(totalIncome - totalExpenses))} over the period.`,
    rawData: { income: totalIncome, expenses: totalExpenses },
    requirements: ["Transaction data must exist"],
  }
  
  // Analyze trends
  const incomeTrend = analyzeTrend(sortedMonths.map(([m, d]) => ({ month: m, value: d.income })))
  const expensesTrend = analyzeTrend(sortedMonths.map(([m, d]) => ({ month: m, value: d.expenses })))
  const netCashFlowTrend = analyzeTrend(sortedMonths.map(([m, d]) => ({ month: m, value: d.net })))
  const savingsRateTrend = analyzeTrend(sortedMonths.map(([m, d]) => ({ month: m, value: d.savingsRate })))
  
  // Category analysis
  const categoryTotals = new Map<string, { amount: number; monthlyAmounts: number[] }>()
  for (const t of periodTransactions) {
    if (t.type !== "expense") continue
    const month = getMonthKey(new Date(t.date))
    const monthIndex = sortedMonths.findIndex(([m]) => m === month)
    
    if (!categoryTotals.has(t.category)) {
      categoryTotals.set(t.category, { amount: 0, monthlyAmounts: new Array(sortedMonths.length).fill(0) })
    }
    const cat = categoryTotals.get(t.category)!
    cat.amount += Math.abs(t.amount)
    if (monthIndex >= 0) {
      cat.monthlyAmounts[monthIndex] += Math.abs(t.amount)
    }
  }
  
  const topExpenseCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([category, data]) => {
      const monthlyAmounts = data.monthlyAmounts.filter(v => v > 0)
      const cv = calculateCV(monthlyAmounts)
      let monthOverMonthChange: number | null = null
      if (data.monthlyAmounts.length >= 2) {
        const recent = data.monthlyAmounts[data.monthlyAmounts.length - 1]
        const previous = data.monthlyAmounts[data.monthlyAmounts.length - 2]
        if (previous > 0) {
          monthOverMonthChange = ((recent - previous) / previous) * 100
        }
      }
      return {
        category,
        amount: data.amount,
        percentOfTotal: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        monthOverMonthChange,
        isVolatile: cv !== null && cv > VOLATILITY_THRESHOLD,
      }
    })
  
  const fixedVsVariable = analyzeFixedVsVariable(periodTransactions, monthlyData)
  
  // Generate insights
  const metrics = { savingsRate, budgetAdherence, netCashFlow, incomeStability, expenseVolatility }
  const trends = { income: incomeTrend, expenses: expensesTrend, netCashFlow: netCashFlowTrend, savingsRate: savingsRateTrend }
  const insights = generateInsights(metrics, trends, dataCompleteness)
  
  // Goal tracking (current month)
  const currentMonth = getMonthKey(now)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysElapsed = now.getDate()
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const currentMonthBucket = monthlyData.get(currentMonth) || { income: 0, expenses: 0, net: 0, savingsRate: 0 }
  
  const goalTracking = evaluateGoalTracking(
    {
      income: currentMonthBucket.income,
      expenses: currentMonthBucket.expenses,
      daysElapsed,
      totalDays: totalDaysInMonth,
    },
    assessDataCompleteness(
      periodTransactions.filter(t => getMonthKey(new Date(t.date)) === currentMonth),
      currentMonthStart,
      now
    )
  )
  
  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      months: monthlyData.size,
    },
    dataCompleteness,
    metrics,
    trends,
    categoryAnalysis: {
      topExpenseCategories,
      fixedVsVariable,
    },
    insights,
    goalTracking,
    analyzedAt: now.toISOString(),
  }
}
