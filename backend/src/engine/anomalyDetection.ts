/**
 * Expense Anomaly Detection Engine (Feature #5)
 * 
 * Flag unusual transactions or spending patterns using Z-Score analysis.
 * Catches fraud, data errors, or behavioral outliers.
 * 
 * Source: Data-Driven Investor Z-Score, DataCamp Isolation Forest
 */

import type {
  TransactionInput,
  AnomalyResult,
  AnomalyAction,
  AnomalyReason,
} from './types.js'
import {
  ANOMALY_ZSCORE_OUTLIER,
  ANOMALY_ZSCORE_EXTREME,
  ANOMALY_LOOKBACK_DAYS,
  ANOMALY_SCORE_REVIEW,
  ANOMALY_SCORE_FLAG,
  DUPLICATE_TIME_WINDOW_HOURS,
  DUPLICATE_AMOUNT_TOLERANCE,
} from './constants.js'
import {
  mean,
  standardDeviation,
  zScore,
  daysBetween,
  isSimilarMerchant,
  normalizeText,
  clamp,
} from './utils.js'

// ============================================================================
// Z-SCORE ANOMALY DETECTION
// ============================================================================

/**
 * Calculate Z-score for a transaction amount in a category
 */
export function calculateZScore(
  amount: number,
  categoryHistory: number[]
): number | null {
  if (categoryHistory.length < 3) return null
  
  const avg = mean(categoryHistory)
  const stdDev = standardDeviation(categoryHistory)
  
  if (stdDev < 0.01) return null // Near-zero variance, can't calculate z-score
  
  return zScore(Math.abs(amount), avg, stdDev)
}

/**
 * Convert Z-score to anomaly score (0-100 scale)
 */
export function zScoreToAnomalyScore(z: number): number {
  // Scale z-score to 0-100
  // z=2 → 66.7, z=3 → 100, z=1 → 33.3
  const score = (z / ANOMALY_ZSCORE_EXTREME) * 100
  return clamp(score, 0, 100)
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Check if transaction is a potential duplicate
 */
export function detectDuplicate(
  transaction: TransactionInput,
  recentTransactions: TransactionInput[],
  timeWindowHours = DUPLICATE_TIME_WINDOW_HOURS,
  amountTolerance = DUPLICATE_AMOUNT_TOLERANCE
): { isDuplicate: boolean; duplicateOf: TransactionInput | null } {
  const txnDate = new Date(transaction.date)
  const txnAmount = Math.abs(transaction.amount)
  
  for (const recent of recentTransactions) {
    if (recent.id === transaction.id) continue
    
    const recentDate = new Date(recent.date)
    const timeDiffHours = Math.abs(txnDate.getTime() - recentDate.getTime()) / (1000 * 60 * 60)
    
    // Check if within time window
    if (timeDiffHours > timeWindowHours) continue
    
    // Check if same merchant (fuzzy match)
    if (!isSimilarMerchant(transaction.description, recent.description)) continue
    
    // Check if same amount (within tolerance)
    const recentAmount = Math.abs(recent.amount)
    if (Math.abs(txnAmount - recentAmount) <= amountTolerance) {
      return { isDuplicate: true, duplicateOf: recent }
    }
  }
  
  return { isDuplicate: false, duplicateOf: null }
}

// ============================================================================
// NEW MERCHANT DETECTION
// ============================================================================

/**
 * Check if merchant is new to a category
 */
export function isNewMerchant(
  transaction: TransactionInput,
  categoryHistory: TransactionInput[]
): boolean {
  const txnMerchant = normalizeText(transaction.description)
  
  for (const hist of categoryHistory) {
    if (isSimilarMerchant(txnMerchant, hist.description)) {
      return false
    }
  }
  
  return true
}

// ============================================================================
// MAIN ANOMALY DETECTION
// ============================================================================

export interface AnomalyDetectionOptions {
  lookbackDays?: number
  zScoreOutlierThreshold?: number
  zScoreExtremeThreshold?: number
  reviewScoreThreshold?: number
  flagScoreThreshold?: number
}

/**
 * Detect anomalies in a single transaction
 * 
 * Checks:
 * 1. Z-score (amount outlier)
 * 2. Duplicate detection
 * 3. New merchant in category
 */
export function detectAnomaly(
  transaction: TransactionInput,
  categoryHistory: TransactionInput[],
  options: AnomalyDetectionOptions = {}
): AnomalyResult {
  const {
    lookbackDays = ANOMALY_LOOKBACK_DAYS,
    zScoreOutlierThreshold = ANOMALY_ZSCORE_OUTLIER,
    zScoreExtremeThreshold = ANOMALY_ZSCORE_EXTREME,
    reviewScoreThreshold = ANOMALY_SCORE_REVIEW,
    flagScoreThreshold = ANOMALY_SCORE_FLAG,
  } = options
  
  // Filter history to lookback window
  const txnDate = new Date(transaction.date)
  const recentHistory = categoryHistory.filter(t => {
    const histDate = new Date(t.date)
    return daysBetween(histDate, txnDate) <= lookbackDays && t.id !== transaction.id
  })
  
  // Insufficient history
  if (recentHistory.length < 3) {
    return {
      anomalyScore: 0,
      reason: 'insufficient_history',
      action: 'none',
      zScore: null,
      expectedRange: null,
      explanation: 'Not enough historical data to assess anomaly status.',
    }
  }
  
  // Check for duplicates first
  const { isDuplicate, duplicateOf } = detectDuplicate(transaction, recentHistory)
  if (isDuplicate) {
    return {
      anomalyScore: 95,
      reason: 'duplicate_detected',
      action: 'review',
      zScore: null,
      expectedRange: null,
      explanation: `Potential duplicate of transaction from ${new Date(duplicateOf!.date).toLocaleDateString()}.`,
    }
  }
  
  // Calculate Z-score
  const amounts = recentHistory.map(t => Math.abs(t.amount))
  const z = calculateZScore(transaction.amount, amounts)
  
  if (z === null) {
    // Check if new merchant (even if z-score unavailable)
    if (isNewMerchant(transaction, recentHistory)) {
      const avg = mean(amounts)
      const txnAmount = Math.abs(transaction.amount)
      
      return {
        anomalyScore: txnAmount > avg * 1.5 ? 45 : 30,
        reason: 'merchant_new',
        action: txnAmount > avg * 1.5 ? 'flag_in_ui' : 'none',
        zScore: null,
        expectedRange: null,
        explanation: 'New merchant in this category. First-time purchase.',
      }
    }
    
    return {
      anomalyScore: 0,
      reason: 'normal',
      action: 'none',
      zScore: null,
      expectedRange: null,
      explanation: 'Transaction appears normal.',
    }
  }
  
  // Calculate expected range
  const avg = mean(amounts)
  const stdDev = standardDeviation(amounts)
  const expectedRange: [number, number] = [
    Math.round((avg - 2 * stdDev) * 100) / 100,
    Math.round((avg + 2 * stdDev) * 100) / 100,
  ]
  
  // Classify based on Z-score
  const absZ = Math.abs(z)
  let anomalyScore = zScoreToAnomalyScore(absZ)
  let reason: AnomalyReason
  let action: AnomalyAction
  let explanation: string
  
  if (absZ >= zScoreExtremeThreshold) {
    reason = 'amount_extreme_outlier'
    action = 'review'
    explanation = `Amount ($${Math.abs(transaction.amount).toFixed(2)}) is extremely unusual. Expected range: $${expectedRange[0].toFixed(2)} - $${expectedRange[1].toFixed(2)}.`
  } else if (absZ >= zScoreOutlierThreshold) {
    reason = 'amount_outlier'
    action = anomalyScore >= reviewScoreThreshold ? 'review' : 'flag_in_ui'
    explanation = `Amount ($${Math.abs(transaction.amount).toFixed(2)}) is higher than typical. Expected range: $${expectedRange[0].toFixed(2)} - $${expectedRange[1].toFixed(2)}.`
  } else {
    // Check if new merchant with reasonable amount
    if (isNewMerchant(transaction, recentHistory)) {
      return {
        anomalyScore: 25,
        reason: 'merchant_new',
        action: 'none',
        zScore: Math.round(z * 100) / 100,
        expectedRange,
        explanation: 'New merchant, but amount is within normal range.',
      }
    }
    
    reason = 'normal'
    action = 'none'
    anomalyScore = 0
    explanation = 'Transaction appears normal.'
  }
  
  return {
    anomalyScore: Math.round(anomalyScore),
    reason,
    action,
    zScore: Math.round(z * 100) / 100,
    expectedRange,
    explanation,
  }
}

// ============================================================================
// BATCH ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies in a batch of transactions
 */
export function detectAnomaliesInBatch(
  transactions: TransactionInput[],
  allTransactions: TransactionInput[],
  options: AnomalyDetectionOptions = {}
): Map<number, AnomalyResult> {
  const results = new Map<number, AnomalyResult>()
  
  // Group all transactions by category for history
  const categoryHistories = new Map<string, TransactionInput[]>()
  for (const t of allTransactions) {
    if (!categoryHistories.has(t.category)) {
      categoryHistories.set(t.category, [])
    }
    categoryHistories.get(t.category)!.push(t)
  }
  
  // Detect anomalies for each transaction
  for (const txn of transactions) {
    const history = categoryHistories.get(txn.category) || []
    const result = detectAnomaly(txn, history, options)
    results.set(txn.id, result)
  }
  
  return results
}

// ============================================================================
// ANOMALY SUMMARY
// ============================================================================

export interface AnomalySummary {
  totalReviewed: number
  anomaliesFound: number
  reviewRequired: number
  flaggedInUI: number
  duplicatesDetected: number
  newMerchants: number
  amountOutliers: number
}

/**
 * Generate summary of anomaly detection results
 */
export function summarizeAnomalies(
  results: Map<number, AnomalyResult>
): AnomalySummary {
  let anomaliesFound = 0
  let reviewRequired = 0
  let flaggedInUI = 0
  let duplicatesDetected = 0
  let newMerchants = 0
  let amountOutliers = 0
  
  for (const result of results.values()) {
    if (result.anomalyScore > 0) {
      anomaliesFound++
    }
    
    if (result.action === 'review') {
      reviewRequired++
    } else if (result.action === 'flag_in_ui') {
      flaggedInUI++
    }
    
    switch (result.reason) {
      case 'duplicate_detected':
        duplicatesDetected++
        break
      case 'merchant_new':
        newMerchants++
        break
      case 'amount_outlier':
      case 'amount_extreme_outlier':
        amountOutliers++
        break
    }
  }
  
  return {
    totalReviewed: results.size,
    anomaliesFound,
    reviewRequired,
    flaggedInUI,
    duplicatesDetected,
    newMerchants,
    amountOutliers,
  }
}
