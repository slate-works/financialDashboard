/**
 * Cash Flow Stability Index Engine (Feature #4)
 * 
 * Measure predictability of monthly cash flow as a proxy for financial resilience.
 * Used for risk assessment, emergency fund adequacy, and job-loss scenario planning.
 * 
 * Source: CFP financial planning, business finance burn rate analysis
 */

import type {
  TransactionInput,
  CashFlowStabilityResult,
  StabilityRating,
  ConfidenceLevel,
  MonthlyAggregate,
} from './types.js'
import {
  STABILITY_UNSTABLE_CV,
  STABILITY_STABLE_CV,
  STABILITY_INDEX,
  MIN_MONTHS_FOR_TREND,
} from './constants.js'
import {
  mean,
  standardDeviation,
  coefficientOfVariation,
  getSortedMonthlyAggregates,
  clamp,
} from './utils.js'

// ============================================================================
// STABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate Coefficient of Variation for cash flow
 * CV = σ / |μ| where μ = mean, σ = standard deviation
 */
export function calculateCashFlowCV(monthlyNetCashFlows: number[]): number | null {
  if (monthlyNetCashFlows.length < 2) return null
  return coefficientOfVariation(monthlyNetCashFlows)
}

/**
 * Calculate stability index (0-100)
 * Higher = more stable
 */
export function calculateStabilityIndex(
  monthlyNetCashFlows: number[],
  nonRecurringRatio: number
): number {
  if (monthlyNetCashFlows.length < 2) return 0
  
  const avg = mean(monthlyNetCashFlows)
  
  // If average net cash flow is negative, stability is compromised
  if (avg < 0) return 0
  
  const cv = coefficientOfVariation(monthlyNetCashFlows)
  if (cv === null) return 0
  
  // Stability = 100 × (1 − min(1, CV)) × (1 − non_recurring_ratio)
  const stabilityFromCV = 1 - Math.min(1, cv)
  const stabilityFromRecurring = 1 - nonRecurringRatio
  
  const rawIndex = 100 * stabilityFromCV * stabilityFromRecurring
  return Math.round(clamp(rawIndex, 0, 100))
}

/**
 * Convert stability index to rating
 */
export function getStabilityRating(index: number): StabilityRating {
  if (index >= STABILITY_INDEX.VERY_STABLE) return 'Very Stable'
  if (index >= STABILITY_INDEX.STABLE) return 'Stable'
  if (index >= STABILITY_INDEX.MODERATE) return 'Moderate'
  return 'Volatile'
}

// ============================================================================
// PROBABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate probability of negative cash flow using normal distribution CDF
 * Φ(−μ/σ) where Φ is standard normal CDF
 */
export function probabilityOfNegativeCF(avg: number, stdDev: number): number | null {
  if (stdDev === 0) {
    // No variance - probability is 0 if mean is positive, 1 if negative
    return avg >= 0 ? 0 : 1
  }
  
  // Calculate z-score for 0 (the boundary for negative CF)
  const z = -avg / stdDev
  
  // Approximate standard normal CDF using error function
  // Φ(z) ≈ 0.5 * (1 + erf(z / sqrt(2)))
  const probability = 0.5 * (1 + erf(z / Math.sqrt(2)))
  
  return Math.round(probability * 1000) / 1000 // 3 decimal places
}

/**
 * Error function approximation
 * Used for normal CDF calculation
 */
function erf(x: number): number {
  // Horner form coefficients for approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

// ============================================================================
// RECURRING VS NON-RECURRING ANALYSIS
// ============================================================================

export interface RecurringAnalysis {
  recurringExpenses: number
  nonRecurringExpenses: number
  recurringRatio: number
  nonRecurringRatio: number
}

/**
 * Estimate recurring vs non-recurring expenses
 * Uses simple heuristic: consistent monthly amounts are likely recurring
 */
export function analyzeRecurringExpenses(
  monthlyAggregates: MonthlyAggregate[]
): RecurringAnalysis {
  if (monthlyAggregates.length < 3) {
    return {
      recurringExpenses: 0,
      nonRecurringExpenses: 0,
      recurringRatio: 0,
      nonRecurringRatio: 1,
    }
  }
  
  const expenses = monthlyAggregates.map(m => m.expenses)
  const avgExpenses = mean(expenses)
  const stdDevExpenses = standardDeviation(expenses)
  
  // Estimate: recurring = mean - stdDev (baseline consistent spending)
  // This is a simplified heuristic; in production, use detected recurring patterns
  const estimatedRecurring = Math.max(0, avgExpenses - stdDevExpenses)
  const estimatedNonRecurring = avgExpenses - estimatedRecurring
  
  const totalExpenses = avgExpenses
  const recurringRatio = totalExpenses > 0 ? estimatedRecurring / totalExpenses : 0
  
  return {
    recurringExpenses: Math.round(estimatedRecurring * 100) / 100,
    nonRecurringExpenses: Math.round(estimatedNonRecurring * 100) / 100,
    recurringRatio: Math.round(recurringRatio * 100) / 100,
    nonRecurringRatio: Math.round((1 - recurringRatio) * 100) / 100,
  }
}

// ============================================================================
// CONFIDENCE ASSESSMENT
// ============================================================================

/**
 * Determine confidence level for stability analysis
 */
export function assessStabilityConfidence(monthCount: number): ConfidenceLevel {
  if (monthCount < MIN_MONTHS_FOR_TREND) return 'insufficient'
  if (monthCount >= 12) return 'high'
  if (monthCount >= 6) return 'medium'
  return 'low'
}

// ============================================================================
// EXPLANATION GENERATION
// ============================================================================

/**
 * Generate human-readable explanation of stability
 */
export function generateStabilityExplanation(
  rating: StabilityRating,
  cv: number | null,
  probNegative: number | null
): string {
  let explanation = ''
  
  switch (rating) {
    case 'Very Stable':
      explanation = 'Cash flow is highly predictable with minimal variation.'
      break
    case 'Stable':
      explanation = 'Cash flow shows minor variations but remains generally consistent.'
      break
    case 'Moderate':
      explanation = 'Cash flow has noticeable fluctuations. Consider building a larger emergency fund buffer.'
      break
    case 'Volatile':
      explanation = 'Cash flow varies significantly month-to-month. Budget conservatively using your lowest income months.'
      break
  }
  
  if (cv !== null && cv > STABILITY_UNSTABLE_CV) {
    explanation += ` Coefficient of variation (${(cv * 100).toFixed(1)}%) indicates high volatility.`
  }
  
  if (probNegative !== null && probNegative > 0.1) {
    explanation += ` There's a ${(probNegative * 100).toFixed(0)}% chance of negative cash flow in any given month.`
  }
  
  return explanation
}

// ============================================================================
// MAIN STABILITY ANALYSIS
// ============================================================================

export interface StabilityAnalysisOptions {
  lookbackMonths?: number
  recurringPatternData?: RecurringAnalysis
}

/**
 * Complete cash flow stability analysis
 */
export function analyzeCashFlowStability(
  transactions: TransactionInput[],
  options: StabilityAnalysisOptions = {}
): CashFlowStabilityResult {
  const { lookbackMonths = 12 } = options
  
  // Get monthly aggregates
  const allMonthly = getSortedMonthlyAggregates(transactions)
  const monthlyAggregates = allMonthly.slice(-lookbackMonths)
  
  // Check for sufficient data
  const confidence = assessStabilityConfidence(monthlyAggregates.length)
  
  if (confidence === 'insufficient') {
    return {
      stabilityIndex: 0,
      rating: 'Volatile',
      coefficientOfVariation: null,
      meanNetCashFlow: 0,
      stdDevNetCashFlow: 0,
      recurringRatio: 0,
      probabilityNegative3Months: null,
      confidence,
      explanation: `Need at least ${MIN_MONTHS_FOR_TREND} months of data for stability analysis. Currently have ${monthlyAggregates.length}.`,
    }
  }
  
  // Calculate net cash flows
  const netCashFlows = monthlyAggregates.map(m => m.net)
  
  // Calculate statistics
  const avgNet = mean(netCashFlows)
  const stdDevNet = standardDeviation(netCashFlows)
  const cv = calculateCashFlowCV(netCashFlows)
  
  // Analyze recurring expenses
  const recurringAnalysis = options.recurringPatternData || analyzeRecurringExpenses(monthlyAggregates)
  
  // Calculate stability index
  const stabilityIndex = calculateStabilityIndex(netCashFlows, recurringAnalysis.nonRecurringRatio)
  const rating = getStabilityRating(stabilityIndex)
  
  // Calculate probability of negative CF
  const probNegative = probabilityOfNegativeCF(avgNet, stdDevNet)
  
  // Generate explanation
  const explanation = generateStabilityExplanation(rating, cv, probNegative)
  
  return {
    stabilityIndex,
    rating,
    coefficientOfVariation: cv !== null ? Math.round(cv * 1000) / 1000 : null,
    meanNetCashFlow: Math.round(avgNet * 100) / 100,
    stdDevNetCashFlow: Math.round(stdDevNet * 100) / 100,
    recurringRatio: recurringAnalysis.recurringRatio,
    probabilityNegative3Months: probNegative,
    confidence,
    explanation,
  }
}

// ============================================================================
// VOLATILITY BREAKDOWN
// ============================================================================

/**
 * Analyze which component (income vs expenses) contributes more to volatility
 */
export function analyzeVolatilitySources(
  monthlyAggregates: MonthlyAggregate[]
): {
  incomeVolatility: number | null
  expenseVolatility: number | null
  primarySource: 'income' | 'expenses' | 'both' | 'neither'
  explanation: string
} {
  if (monthlyAggregates.length < 3) {
    return {
      incomeVolatility: null,
      expenseVolatility: null,
      primarySource: 'neither',
      explanation: 'Insufficient data to analyze volatility sources.',
    }
  }
  
  const incomes = monthlyAggregates.map(m => m.income)
  const expenses = monthlyAggregates.map(m => m.expenses)
  
  const incomeCV = coefficientOfVariation(incomes)
  const expenseCV = coefficientOfVariation(expenses)
  
  let primarySource: 'income' | 'expenses' | 'both' | 'neither'
  let explanation: string
  
  const threshold = 0.2 // 20% CV threshold for "volatile"
  
  const incomeVolatile = incomeCV !== null && incomeCV > threshold
  const expenseVolatile = expenseCV !== null && expenseCV > threshold
  
  if (incomeVolatile && expenseVolatile) {
    primarySource = 'both'
    explanation = 'Both income and expenses show significant variation.'
  } else if (incomeVolatile) {
    primarySource = 'income'
    explanation = 'Income is the primary source of cash flow volatility. Expenses are relatively stable.'
  } else if (expenseVolatile) {
    primarySource = 'expenses'
    explanation = 'Expenses are the primary source of cash flow volatility. Income is relatively stable.'
  } else {
    primarySource = 'neither'
    explanation = 'Both income and expenses are relatively stable.'
  }
  
  return {
    incomeVolatility: incomeCV !== null ? Math.round(incomeCV * 100) : null,
    expenseVolatility: expenseCV !== null ? Math.round(expenseCV * 100) : null,
    primarySource,
    explanation,
  }
}
