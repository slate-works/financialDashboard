/**
 * Budget Variance Engine (Feature #1)
 * 
 * Compare planned spending to actual, identify over/under categories.
 * Based on YNAB budgeting principles and CFP financial planning standards.
 */

import type {
  TransactionInput,
  BudgetVarianceResult,
  MonthlyBudgetReport,
  VarianceStatus,
} from './types.js'
import {
  BUDGET_VARIANCE_ON_TRACK,
  BUDGET_VARIANCE_ALERT,
  EXCLUDED_BUDGET_CATEGORIES,
} from './constants.js'
import { getMonthKey, aggregateByCategory, mean } from './utils.js'

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

/**
 * Calculate budget variance percentage
 * Formula: (Actual − Budget) / Budget × 100
 * 
 * @param budget - Budgeted amount
 * @param actual - Actual spent amount
 * @returns Variance as percentage (positive = over budget, negative = under)
 */
export function calculateBudgetVariance(budget: number, actual: number): number {
  if (budget === 0) {
    // If no budget set but spending occurred, return Infinity to flag for review
    return actual > 0 ? Infinity : 0
  }
  return ((actual - budget) / budget) * 100
}

/**
 * Classify variance status based on thresholds
 * 
 * @param variance - Variance percentage
 * @returns Status classification
 */
export function classifyVarianceStatus(variance: number): VarianceStatus {
  if (!Number.isFinite(variance)) return 'Over Budget'
  if (variance > BUDGET_VARIANCE_ON_TRACK * 100) return 'Over Budget'
  if (variance < -BUDGET_VARIANCE_ON_TRACK * 100) return 'Under Budget'
  return 'On Track'
}

/**
 * Determine if a category should be flagged for review
 * 
 * @param variance - Variance percentage
 * @returns True if variance exceeds alert threshold
 */
export function isRedFlag(variance: number): boolean {
  if (!Number.isFinite(variance)) return true
  return variance > BUDGET_VARIANCE_ALERT * 100
}

/**
 * Calculate month-end surplus/deficit
 * 
 * @param income - Total income for the month
 * @param expenses - Total expenses for the month
 * @returns Surplus (positive) or deficit (negative)
 */
export function calculateMonthSurplus(income: number, expenses: number): number {
  return income - expenses
}

// ============================================================================
// CATEGORY-LEVEL ANALYSIS
// ============================================================================

/**
 * Calculate variance for a single category
 */
export function calculateCategoryVariance(
  category: string,
  budgeted: number,
  actual: number
): BudgetVarianceResult {
  const variance = calculateBudgetVariance(budgeted, actual)
  const status = classifyVarianceStatus(variance)
  
  return {
    category,
    budgeted,
    actual,
    variance: Number.isFinite(variance) ? variance : 999,
    varianceAmount: actual - budgeted,
    status,
    isRedFlag: isRedFlag(variance),
  }
}

/**
 * Generate budget variance report for multiple categories
 */
export function generateCategoryVarianceReport(
  budgets: Array<{ category: string; amount: number }>,
  actuals: Map<string, number>
): BudgetVarianceResult[] {
  const results: BudgetVarianceResult[] = []
  
  // Process budgeted categories
  for (const budget of budgets) {
    if (EXCLUDED_BUDGET_CATEGORIES.includes(budget.category as any)) continue
    
    const actual = actuals.get(budget.category) || 0
    results.push(calculateCategoryVariance(budget.category, budget.amount, actual))
  }
  
  // Add categories with spending but no budget
  for (const [category, actual] of actuals) {
    if (EXCLUDED_BUDGET_CATEGORIES.includes(category as any)) continue
    if (!budgets.some(b => b.category === category)) {
      results.push(calculateCategoryVariance(category, 0, actual))
    }
  }
  
  return results.sort((a, b) => b.varianceAmount - a.varianceAmount)
}

// ============================================================================
// MONTHLY REPORT GENERATION
// ============================================================================

/**
 * Generate a complete monthly budget report
 */
export function generateMonthlyBudgetReport(
  month: string,
  budgets: Array<{ category: string; amount: number }>,
  transactions: TransactionInput[],
  income?: number
): MonthlyBudgetReport {
  // Filter transactions for this month
  const monthTransactions = transactions.filter(
    t => getMonthKey(new Date(t.date)) === month
  )
  
  // Calculate actual spending by category
  const actuals = aggregateByCategory(monthTransactions, 'expense')
  
  // Generate category variances
  const categories = generateCategoryVarianceReport(budgets, actuals)
  
  // Calculate totals
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalActual = categories.reduce((sum, c) => sum + c.actual, 0)
  const totalVariance = calculateBudgetVariance(totalBudgeted, totalActual)
  
  // Calculate income if not provided
  const monthIncome = income ?? monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  return {
    month,
    totalBudgeted,
    totalActual,
    totalVariance: Number.isFinite(totalVariance) ? totalVariance : 0,
    surplus: calculateMonthSurplus(monthIncome, totalActual),
    categories,
    redFlagCount: categories.filter(c => c.isRedFlag).length,
  }
}

// ============================================================================
// YEAR-TO-DATE TRACKING
// ============================================================================

/**
 * Calculate year-to-date budget tracking
 */
export function getYTDTracking(
  budgets: Array<{ category: string; amount: number; period: 'monthly' | 'annual' }>,
  transactions: TransactionInput[],
  year?: number
): {
  ytdBudgeted: number
  ytdActual: number
  ytdVariance: number
  monthsElapsed: number
  projectedYearEnd: number
  categories: Array<BudgetVarianceResult & { ytdActual: number; annualBudget: number }>
} {
  const targetYear = year ?? new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const monthsElapsed = targetYear === new Date().getFullYear() ? currentMonth : 12
  
  // Filter transactions for the year
  const yearTransactions = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear() === targetYear
  })
  
  // Calculate YTD actuals by category
  const ytdActuals = aggregateByCategory(yearTransactions, 'expense')
  
  // Calculate YTD budgets
  const categoryResults: Array<BudgetVarianceResult & { ytdActual: number; annualBudget: number }> = []
  let ytdBudgeted = 0
  
  for (const budget of budgets) {
    if (EXCLUDED_BUDGET_CATEGORIES.includes(budget.category as any)) continue
    
    const annualBudget = budget.period === 'annual' ? budget.amount : budget.amount * 12
    const ytdBudgetAmount = budget.period === 'annual' 
      ? (budget.amount / 12) * monthsElapsed 
      : budget.amount * monthsElapsed
    
    ytdBudgeted += ytdBudgetAmount
    const ytdActual = ytdActuals.get(budget.category) || 0
    
    const varianceResult = calculateCategoryVariance(budget.category, ytdBudgetAmount, ytdActual)
    categoryResults.push({
      ...varianceResult,
      ytdActual,
      annualBudget,
    })
  }
  
  const ytdActual = categoryResults.reduce((sum, c) => sum + c.ytdActual, 0)
  const ytdVariance = calculateBudgetVariance(ytdBudgeted, ytdActual)
  
  // Project year-end based on current run rate
  const monthlyRate = ytdActual / monthsElapsed
  const projectedYearEnd = monthlyRate * 12
  
  return {
    ytdBudgeted,
    ytdActual,
    ytdVariance: Number.isFinite(ytdVariance) ? ytdVariance : 0,
    monthsElapsed,
    projectedYearEnd,
    categories: categoryResults.sort((a, b) => b.varianceAmount - a.varianceAmount),
  }
}

// ============================================================================
// SEASONAL ADJUSTMENT
// ============================================================================

/**
 * Detect seasonal patterns in a category's spending
 * Requires 12+ months of data
 */
export function detectSeasonality(
  monthlyAmounts: Array<{ month: string; amount: number }>
): { hasSeasonal: boolean; seasonalFactors: Map<number, number> } {
  if (monthlyAmounts.length < 12) {
    return { hasSeasonal: false, seasonalFactors: new Map() }
  }
  
  // Group by calendar month
  const byCalendarMonth = new Map<number, number[]>()
  for (const { month, amount } of monthlyAmounts) {
    const calendarMonth = parseInt(month.split('-')[1]!, 10)
    if (!byCalendarMonth.has(calendarMonth)) {
      byCalendarMonth.set(calendarMonth, [])
    }
    byCalendarMonth.get(calendarMonth)!.push(amount)
  }
  
  // Calculate average for each calendar month
  const overallMean = mean(monthlyAmounts.map(m => m.amount))
  const seasonalFactors = new Map<number, number>()
  
  for (const [calMonth, amounts] of byCalendarMonth) {
    const monthMean = mean(amounts)
    const factor = overallMean > 0 ? monthMean / overallMean : 1
    seasonalFactors.set(calMonth, factor)
  }
  
  // Determine if seasonal pattern exists (variance in factors > 20%)
  const factors = Array.from(seasonalFactors.values())
  const factorVariance = Math.max(...factors) - Math.min(...factors)
  const hasSeasonal = factorVariance > 0.4 // 40% swing indicates seasonality
  
  return { hasSeasonal, seasonalFactors }
}

/**
 * Adjust budget based on seasonal factors
 */
export function getSeasonallyAdjustedBudget(
  baseBudget: number,
  targetMonth: number,
  seasonalFactors: Map<number, number>
): number {
  const factor = seasonalFactors.get(targetMonth) ?? 1
  return baseBudget * factor
}

// ============================================================================
// FIRST-MONTH HANDLING
// ============================================================================

/**
 * Generate suggested budget for first month based on actual spending
 * Uses rolling average of available data
 */
export function suggestInitialBudget(
  transactions: TransactionInput[],
  category: string,
  lookbackMonths = 3
): { suggested: number; confidence: 'low' | 'medium' | 'high'; note: string } {
  const categoryTxns = transactions.filter(
    t => t.category === category && t.type === 'expense'
  )
  
  if (categoryTxns.length === 0) {
    return {
      suggested: 0,
      confidence: 'low',
      note: 'No historical data for this category',
    }
  }
  
  // Group by month
  const monthlyTotals = new Map<string, number>()
  for (const t of categoryTxns) {
    const month = getMonthKey(new Date(t.date))
    const current = monthlyTotals.get(month) || 0
    monthlyTotals.set(month, current + Math.abs(t.amount))
  }
  
  const amounts = Array.from(monthlyTotals.values())
  const monthCount = amounts.length
  
  // Calculate average
  const avg = mean(amounts)
  
  // Round up to nearest $10 for budget
  const suggested = Math.ceil(avg / 10) * 10
  
  let confidence: 'low' | 'medium' | 'high'
  let note: string
  
  if (monthCount >= lookbackMonths) {
    confidence = 'high'
    note = `Based on ${monthCount} months of data`
  } else if (monthCount >= 2) {
    confidence = 'medium'
    note = `Based on ${monthCount} months - more data will improve accuracy`
  } else {
    confidence = 'low'
    note = 'Only 1 month of data - budget may need adjustment'
  }
  
  return { suggested, confidence, note }
}
