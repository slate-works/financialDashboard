/**
 * Financial Analytics Engine - Shared Utility Functions
 * 
 * Pure, deterministic helper functions used across engine modules.
 */

import type { 
  ConfidenceLevel, 
  TransactionInput, 
  MonthlyAggregate,
  TrendDirection,
  TrendAnalysis
} from './types.js'
import {
  HIGH_CONFIDENCE_COVERAGE,
  MEDIUM_CONFIDENCE_COVERAGE,
  MIN_MONTHS_FOR_TREND,
} from './constants.js'

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate the mean (average) of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate the standard deviation of an array of numbers
 * Uses sample standard deviation (n-1 denominator)
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Calculate the coefficient of variation (CV = stddev / |mean|)
 * Returns null if mean is 0 or insufficient data
 */
export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null
  const avg = mean(values)
  if (avg === 0) return null
  const stdDev = standardDeviation(values)
  return stdDev / Math.abs(avg)
}

/**
 * Calculate rolling average for the last N items
 */
export function rollingAverage(values: number[], n: number): number | null {
  if (values.length < n) return null
  const lastN = values.slice(-n)
  return mean(lastN)
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Calculate percentile of an array
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor((p / 100) * sorted.length)
  return sorted[Math.min(index, sorted.length - 1)]!
}

/**
 * Calculate z-score: (value - mean) / stdDev
 */
export function zScore(value: number, avg: number, stdDev: number): number {
  if (stdDev === 0 || stdDev < 0.01) return 0
  return (value - avg) / stdDev
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get month key in YYYY-MM format from a Date
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Parse a YYYY-MM string into a Date (first day of month)
 */
export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year!, month! - 1, 1)
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs(date2.getTime() - date1.getTime()) / msPerDay)
}

/**
 * Get the first day of a month
 */
export function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Get the last day of a month
 */
export function lastOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Get number of days in a month
 */
export function daysInMonth(date: Date): number {
  return lastOfMonth(date).getDate()
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency value
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage value
 */
export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null) return '--'
  return `${value.toFixed(decimals)}%`
}

// ============================================================================
// CONFIDENCE & DATA QUALITY
// ============================================================================

/**
 * Determine confidence level based on data completeness
 */
export function determineConfidence(
  coverage: number,
  hasIncome: boolean,
  hasExpenses: boolean
): ConfidenceLevel {
  if (coverage >= HIGH_CONFIDENCE_COVERAGE && hasIncome && hasExpenses) return 'high'
  if (coverage >= MEDIUM_CONFIDENCE_COVERAGE && (hasIncome || hasExpenses)) return 'medium'
  if (coverage > 0) return 'low'
  return 'insufficient'
}

/**
 * Determine confidence level from coefficient of variation
 */
export function confidenceFromCV(cv: number | null, minMonths: number, actualMonths: number): ConfidenceLevel {
  if (actualMonths < minMonths || cv === null) return 'insufficient'
  if (cv < 0.2 && actualMonths >= 6) return 'high'
  if (cv < 0.4 && actualMonths >= 3) return 'medium'
  return 'low'
}

// ============================================================================
// AGGREGATION UTILITIES
// ============================================================================

/**
 * Aggregate transactions by month
 */
export function aggregateByMonth(transactions: TransactionInput[]): Map<string, MonthlyAggregate> {
  const monthly = new Map<string, MonthlyAggregate>()

  for (const t of transactions) {
    if (t.type === 'transfer') continue

    const monthKey = getMonthKey(new Date(t.date))

    if (!monthly.has(monthKey)) {
      monthly.set(monthKey, {
        month: monthKey,
        income: 0,
        expenses: 0,
        net: 0,
        savingsRate: 0,
        transactionCount: 0,
      })
    }

    const bucket = monthly.get(monthKey)!
    bucket.transactionCount++

    if (t.type === 'income') {
      bucket.income += Math.abs(t.amount)
    } else if (t.type === 'expense') {
      bucket.expenses += Math.abs(t.amount)
    }

    bucket.net = bucket.income - bucket.expenses
    bucket.savingsRate = bucket.income > 0 ? (bucket.net / bucket.income) * 100 : 0
  }

  return monthly
}

/**
 * Get sorted monthly aggregates as an array
 */
export function getSortedMonthlyAggregates(transactions: TransactionInput[]): MonthlyAggregate[] {
  const monthly = aggregateByMonth(transactions)
  return Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Aggregate transactions by category
 */
export function aggregateByCategory(
  transactions: TransactionInput[],
  type: 'income' | 'expense' | 'all' = 'expense'
): Map<string, number> {
  const categories = new Map<string, number>()

  for (const t of transactions) {
    if (t.type === 'transfer') continue
    if (type !== 'all' && t.type !== type) continue

    const current = categories.get(t.category) || 0
    categories.set(t.category, current + Math.abs(t.amount))
  }

  return categories
}

/**
 * Get monthly amounts for a specific category
 */
export function getMonthlyAmountsForCategory(
  transactions: TransactionInput[],
  category: string
): Array<{ month: string; amount: number }> {
  const monthly = new Map<string, number>()

  for (const t of transactions) {
    if (t.category !== category) continue
    if (t.type === 'transfer') continue

    const monthKey = getMonthKey(new Date(t.date))
    const current = monthly.get(monthKey) || 0
    monthly.set(monthKey, current + Math.abs(t.amount))
  }

  return Array.from(monthly.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Analyze trend for a series of monthly values
 */
export function analyzeTrend(
  monthlyData: Array<{ month: string; value: number }>
): TrendAnalysis {
  const values = monthlyData.map(d => d.value)
  const hasEnoughData = values.length >= MIN_MONTHS_FOR_TREND

  if (!hasEnoughData) {
    return {
      direction: 'insufficient',
      changePercent: null,
      rollingAvg3Month: null,
      rollingAvg6Month: null,
      standardDeviation: null,
      coefficientOfVariation: null,
      monthlyValues: monthlyData,
      explanation: `Need at least ${MIN_MONTHS_FOR_TREND} months of data for trend analysis. Currently have ${values.length}.`,
      confidence: 'insufficient',
    }
  }

  const stdDev = standardDeviation(values)
  const cv = coefficientOfVariation(values)
  const avg = mean(values)
  const rollingAvg3 = rollingAverage(values, 3)
  const rollingAvg6 = rollingAverage(values, 6)

  // Calculate trend direction using first half vs second half comparison
  let direction: TrendDirection = 'stable'
  let changePercent: number | null = null

  if (values.length >= 2) {
    const midPoint = Math.floor(values.length / 2)
    const firstHalf = values.slice(0, midPoint)
    const secondHalf = values.slice(midPoint)
    const firstAvg = mean(firstHalf)
    const secondAvg = mean(secondHalf)

    if (firstAvg > 0) {
      changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    }

    // Determine direction
    if (cv !== null && cv > 0.3) {
      direction = 'volatile'
    } else if (changePercent !== null) {
      if (changePercent > 10) direction = 'increasing'
      else if (changePercent < -10) direction = 'decreasing'
      else direction = 'stable'
    }
  }

  // Build explanation
  let explanation: string
  switch (direction) {
    case 'increasing':
      explanation = `Trending upward: ${formatPercent(changePercent)} change comparing recent months to earlier months.`
      break
    case 'decreasing':
      explanation = `Trending downward: ${formatPercent(changePercent)} change comparing recent months to earlier months.`
      break
    case 'volatile':
      explanation = `Highly variable: Values fluctuate significantly (CV: ${formatPercent(cv ? cv * 100 : null)}). Look for irregular large items.`
      break
    case 'stable':
      explanation = 'Relatively stable: Values remain consistent within normal variation.'
      break
    default:
      explanation = 'Insufficient data for trend analysis.'
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
    confidence: values.length >= 6 ? 'high' : 'medium',
  }
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy merchant matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  
  if (aLower === bLower) return 0
  if (aLower.length === 0) return bLower.length
  if (bLower.length === 0) return aLower.length

  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0]![j] = j
  }

  // Fill matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const cost = aLower[j - 1] === bLower[i - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,      // deletion
        matrix[i]![j - 1]! + 1,      // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      )
    }
  }

  return matrix[bLower.length]![aLower.length]!
}

/**
 * Check if two merchant names are similar (fuzzy match)
 */
export function isSimilarMerchant(a: string, b: string, maxDistance = 2): boolean {
  // Normalize strings
  const normalizeStr = (s: string) => 
    s.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
  
  const aNorm = normalizeStr(a)
  const bNorm = normalizeStr(b)
  
  // Exact match after normalization
  if (aNorm === bNorm) return true
  
  // One contains the other
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true
  
  // Levenshtein distance
  return levenshteinDistance(aNorm, bNorm) <= maxDistance
}

/**
 * Normalize text for consistent comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u2016\uFFFD\u0092\u0091'`´ʼʻˈˊ‖]/g, "'")
    .replace(/[\u201C\u201D\u0093\u0094""„‟]/g, '"')
    .replace(/[\u2013\u2014\u2015\u0096\u0097]/g, '-')
    .trim()
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Check if a value is a valid finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Safe division that returns 0 for division by zero
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}
