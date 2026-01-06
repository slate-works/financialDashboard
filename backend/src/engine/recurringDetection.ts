/**
 * Recurring Transaction Detection Engine (Feature #2)
 * 
 * Automatically identify subscriptions, bills, and paychecks using
 * rule-based temporal pattern detection.
 * 
 * Source: Fintech consensus, Meniga recurring payment detection
 */

import type {
  TransactionInput,
  RecurringPatternResult,
  RecurringPeriod,
  RecurringStatus,
} from './types.js'
import {
  RECURRING_AMOUNT_TOLERANCE,
  RECURRING_DATE_TOLERANCE_MONTHLY,
  RECURRING_DATE_TOLERANCE_WEEKLY,
  RECURRING_DATE_TOLERANCE_BIWEEKLY,
  RECURRING_DATE_TOLERANCE_QUARTERLY,
  RECURRING_DATE_TOLERANCE_ANNUAL,
  RECURRING_MIN_CONSISTENCY,
  RECURRING_MIN_OCCURRENCES_CONFIRMED,
  RECURRING_MIN_OCCURRENCES_UNCONFIRMED,
} from './constants.js'
import {
  mean,
  standardDeviation,
  median,
  addDays,
  daysBetween,
  isSimilarMerchant,
  normalizeText,
} from './utils.js'

// ============================================================================
// PERIOD DETECTION
// ============================================================================

interface PeriodDetectionResult {
  period: RecurringPeriod
  tolerance: number
  expectedInterval: number
}

/**
 * Identify the period type from median interval between transactions
 */
export function identifyPeriod(intervalDays: number): PeriodDetectionResult {
  // Weekly: ~7 days
  if (Math.abs(intervalDays - 7) <= RECURRING_DATE_TOLERANCE_WEEKLY) {
    return { period: 'Weekly', tolerance: RECURRING_DATE_TOLERANCE_WEEKLY, expectedInterval: 7 }
  }
  
  // Bi-weekly: ~14 days
  if (Math.abs(intervalDays - 14) <= RECURRING_DATE_TOLERANCE_BIWEEKLY) {
    return { period: 'Bi-weekly', tolerance: RECURRING_DATE_TOLERANCE_BIWEEKLY, expectedInterval: 14 }
  }
  
  // Monthly: ~30 days or same day of month
  if (Math.abs(intervalDays - 30) <= RECURRING_DATE_TOLERANCE_MONTHLY || 
      (intervalDays >= 28 && intervalDays <= 31)) {
    return { period: 'Monthly', tolerance: RECURRING_DATE_TOLERANCE_MONTHLY, expectedInterval: 30 }
  }
  
  // Quarterly: ~90 days
  if (Math.abs(intervalDays - 90) <= RECURRING_DATE_TOLERANCE_QUARTERLY) {
    return { period: 'Quarterly', tolerance: RECURRING_DATE_TOLERANCE_QUARTERLY, expectedInterval: 90 }
  }
  
  // Annual: ~365 days
  if (Math.abs(intervalDays - 365) <= RECURRING_DATE_TOLERANCE_ANNUAL) {
    return { period: 'Annual', tolerance: RECURRING_DATE_TOLERANCE_ANNUAL, expectedInterval: 365 }
  }
  
  return { period: 'Unknown', tolerance: 0, expectedInterval: 0 }
}

// ============================================================================
// GROUPING & FILTERING
// ============================================================================

/**
 * Group transactions by merchant and category
 */
export function groupTransactionsByMerchant(
  transactions: TransactionInput[]
): Map<string, TransactionInput[]> {
  const groups = new Map<string, TransactionInput[]>()
  
  for (const t of transactions) {
    // Create normalized key from merchant and category
    const normalizedMerchant = normalizeText(t.description)
    const key = `${normalizedMerchant}|${t.category}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(t)
  }
  
  // Merge similar merchants using fuzzy matching
  const mergedGroups = new Map<string, TransactionInput[]>()
  const processedKeys = new Set<string>()
  
  for (const [key, txns] of groups) {
    if (processedKeys.has(key)) continue
    
    const [merchant, category] = key.split('|')
    let mergedTxns = [...txns]
    
    // Check for similar merchants in same category
    for (const [otherKey, otherTxns] of groups) {
      if (key === otherKey || processedKeys.has(otherKey)) continue
      
      const [otherMerchant, otherCategory] = otherKey.split('|')
      
      if (category === otherCategory && isSimilarMerchant(merchant!, otherMerchant!)) {
        mergedTxns = [...mergedTxns, ...otherTxns]
        processedKeys.add(otherKey)
      }
    }
    
    processedKeys.add(key)
    mergedGroups.set(key, mergedTxns)
  }
  
  return mergedGroups
}

/**
 * Filter outliers from a group based on amount variance
 */
export function filterOutliers(
  transactions: TransactionInput[],
  tolerance = RECURRING_AMOUNT_TOLERANCE
): TransactionInput[] {
  if (transactions.length < 3) return transactions
  
  const amounts = transactions.map(t => Math.abs(t.amount))
  const avg = mean(amounts)
  const stdDev = standardDeviation(amounts)
  
  // Filter transactions within 2 standard deviations OR within amount tolerance
  return transactions.filter(t => {
    const amount = Math.abs(t.amount)
    const zScore = stdDev > 0 ? Math.abs(amount - avg) / stdDev : 0
    const percentDiff = avg > 0 ? Math.abs(amount - avg) / avg : 0
    
    return zScore <= 2 || percentDiff <= tolerance
  })
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate confidence score for a recurring pattern
 * Based on consistency and amount variance
 */
export function calculateConfidence(
  consistency: number,
  amountVarianceCoeff: number
): number {
  // Confidence = consistency × (1 − amount_variance_coeff)
  const rawConfidence = consistency * (1 - Math.min(1, amountVarianceCoeff))
  return Math.round(rawConfidence * 100)
}

// ============================================================================
// MAIN DETECTION ALGORITHM
// ============================================================================

export interface RecurringDetectionOptions {
  amountTolerance?: number
  minOccurrencesConfirmed?: number
  minOccurrencesUnconfirmed?: number
  minConsistency?: number
  lookbackMonths?: number
}

/**
 * Detect recurring patterns in transactions
 * 
 * Algorithm:
 * 1. Group transactions by merchant and category
 * 2. Filter outliers based on amount variance
 * 3. Calculate intervals between transactions
 * 4. Detect periodicity (weekly, monthly, etc.)
 * 5. Calculate consistency score
 * 6. Calculate confidence score
 * 7. Classify as Confirmed or Unconfirmed
 */
export function detectRecurringPatterns(
  transactions: TransactionInput[],
  options: RecurringDetectionOptions = {}
): RecurringPatternResult[] {
  const {
    amountTolerance = RECURRING_AMOUNT_TOLERANCE,
    minOccurrencesConfirmed = RECURRING_MIN_OCCURRENCES_CONFIRMED,
    minOccurrencesUnconfirmed = RECURRING_MIN_OCCURRENCES_UNCONFIRMED,
    minConsistency = RECURRING_MIN_CONSISTENCY,
  } = options
  
  const results: RecurringPatternResult[] = []
  
  // Step 1: Group by merchant and category
  const groups = groupTransactionsByMerchant(transactions)
  
  for (const [key, groupTxns] of groups) {
    // Need at least 2 occurrences
    if (groupTxns.length < minOccurrencesUnconfirmed) continue
    
    // Step 2: Filter outliers
    const filteredTxns = filterOutliers(groupTxns, amountTolerance)
    if (filteredTxns.length < minOccurrencesUnconfirmed) continue
    
    // Sort by date
    const sortedTxns = [...filteredTxns].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Step 3: Calculate intervals
    const intervals: number[] = []
    for (let i = 1; i < sortedTxns.length; i++) {
      const interval = daysBetween(
        new Date(sortedTxns[i - 1]!.date),
        new Date(sortedTxns[i]!.date)
      )
      intervals.push(interval)
    }
    
    if (intervals.length === 0) continue
    
    // Step 4: Detect period
    const medianInterval = median(intervals)
    const { period, tolerance, expectedInterval } = identifyPeriod(medianInterval)
    
    if (period === 'Unknown') continue
    
    // Step 5: Calculate consistency
    let consistentCount = 0
    for (const interval of intervals) {
      if (Math.abs(interval - expectedInterval) <= tolerance) {
        consistentCount++
      }
    }
    const consistency = consistentCount / intervals.length
    
    // Step 6: Calculate confidence
    const amounts = sortedTxns.map(t => Math.abs(t.amount))
    const avgAmount = mean(amounts)
    const stdDevAmount = standardDeviation(amounts)
    const amountVarianceCoeff = avgAmount > 0 ? stdDevAmount / avgAmount : 0
    const confidence = calculateConfidence(consistency, amountVarianceCoeff)
    
    // Step 7: Classify status
    let status: RecurringStatus
    if (sortedTxns.length >= minOccurrencesConfirmed && consistency >= minConsistency) {
      status = 'Confirmed'
    } else if (sortedTxns.length >= minOccurrencesUnconfirmed && consistency >= minConsistency) {
      status = 'Unconfirmed'
    } else {
      continue // Not enough evidence for a pattern
    }
    
    // Calculate next expected date
    const lastDate = new Date(sortedTxns[sortedTxns.length - 1]!.date)
    const nextExpectedDate = addDays(lastDate, Math.round(medianInterval))
    
    // Extract merchant name (first part of key)
    const [merchantPart, categoryPart] = key.split('|')
    
    results.push({
      merchant: sortedTxns[0]!.description, // Use original description
      category: categoryPart!,
      avgAmount: Math.round(avgAmount * 100) / 100,
      period,
      confidence,
      status,
      lastOccurrenceDate: lastDate,
      nextExpectedDate,
      occurrences: sortedTxns.length,
      transactions: sortedTxns,
    })
  }
  
  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence)
}

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

/**
 * Check if a new transaction matches an expected recurring pattern
 */
export function matchesPattern(
  transaction: TransactionInput,
  pattern: RecurringPatternResult,
  amountTolerance = RECURRING_AMOUNT_TOLERANCE
): { matches: boolean; reason: string } {
  // Check merchant match
  if (!isSimilarMerchant(transaction.description, pattern.merchant)) {
    return { matches: false, reason: 'Merchant name does not match' }
  }
  
  // Check category match
  if (transaction.category !== pattern.category) {
    return { matches: false, reason: 'Category does not match' }
  }
  
  // Check amount within tolerance
  const amountDiff = Math.abs(Math.abs(transaction.amount) - pattern.avgAmount)
  const percentDiff = pattern.avgAmount > 0 ? amountDiff / pattern.avgAmount : 0
  
  if (percentDiff > amountTolerance) {
    return { matches: false, reason: `Amount differs by ${(percentDiff * 100).toFixed(1)}%` }
  }
  
  // Check date is near expected
  const txnDate = new Date(transaction.date)
  const expectedDate = pattern.nextExpectedDate
  const daysDiff = daysBetween(txnDate, expectedDate)
  
  const { tolerance } = identifyPeriod(
    pattern.period === 'Weekly' ? 7 :
    pattern.period === 'Bi-weekly' ? 14 :
    pattern.period === 'Monthly' ? 30 :
    pattern.period === 'Quarterly' ? 90 :
    pattern.period === 'Annual' ? 365 : 30
  )
  
  if (daysDiff > tolerance * 2) {
    return { matches: false, reason: `Date is ${daysDiff} days from expected` }
  }
  
  return { matches: true, reason: 'Transaction matches expected pattern' }
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Detect potential duplicate transactions (same merchant, amount, same day)
 */
export function detectDuplicates(
  transactions: TransactionInput[]
): Array<{ transaction: TransactionInput; duplicateOf: TransactionInput }> {
  const duplicates: Array<{ transaction: TransactionInput; duplicateOf: TransactionInput }> = []
  const seen = new Map<string, TransactionInput>()
  
  for (const t of transactions) {
    const dateKey = new Date(t.date).toISOString().split('T')[0]
    const key = `${normalizeText(t.description)}|${Math.abs(t.amount).toFixed(2)}|${dateKey}`
    
    if (seen.has(key)) {
      duplicates.push({
        transaction: t,
        duplicateOf: seen.get(key)!,
      })
    } else {
      seen.set(key, t)
    }
  }
  
  return duplicates
}

// ============================================================================
// SUBSCRIPTION SUMMARY
// ============================================================================

/**
 * Calculate total recurring expenses
 */
export function calculateRecurringTotal(
  patterns: RecurringPatternResult[],
  periodFilter: 'all' | 'monthly' = 'monthly'
): { monthly: number; annual: number } {
  let monthlyTotal = 0
  
  for (const pattern of patterns) {
    if (pattern.status !== 'Confirmed') continue
    
    // Normalize to monthly amount
    let monthlyAmount: number
    switch (pattern.period) {
      case 'Weekly':
        monthlyAmount = pattern.avgAmount * 4.33 // ~4.33 weeks per month
        break
      case 'Bi-weekly':
        monthlyAmount = pattern.avgAmount * 2.17
        break
      case 'Monthly':
        monthlyAmount = pattern.avgAmount
        break
      case 'Quarterly':
        monthlyAmount = pattern.avgAmount / 3
        break
      case 'Annual':
        monthlyAmount = pattern.avgAmount / 12
        break
      default:
        monthlyAmount = pattern.avgAmount
    }
    
    monthlyTotal += monthlyAmount
  }
  
  return {
    monthly: Math.round(monthlyTotal * 100) / 100,
    annual: Math.round(monthlyTotal * 12 * 100) / 100,
  }
}
