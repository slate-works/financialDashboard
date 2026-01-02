/**
 * Budget Adherence Consistency Tracker (Feature #9)
 * 
 * Track whether users improve their budget adherence over time.
 * Identifies chronic problem categories and provides trend analysis.
 * 
 * Source: YNAB methodology, behavioral finance principles
 */

import type {
  TransactionInput,
  AdherenceHistoryEntry,
  AdherenceAnalysisResult,
  AdherenceRating,
} from './types.js'
import {
  ADHERENCE_EXCELLENT,
  ADHERENCE_GOOD,
  ADHERENCE_FAIR,
  ADHERENCE_TREND_IMPROVEMENT,
  ADHERENCE_TREND_DECLINE,
} from './constants.js'
import {
  mean,
  getMonthKey,
  aggregateByCategory,
  clamp,
} from './utils.js'

// ============================================================================
// MONTHLY ADHERENCE CALCULATION
// ============================================================================

/**
 * Calculate adherence score for a single category
 * Score = 100 × max(0, 1 − |variance|)
 * Perfect score = exactly on budget
 */
export function calculateCategoryAdherence(budgeted: number, actual: number): number {
  if (budgeted === 0) {
    return actual === 0 ? 100 : 0
  }
  
  const variance = Math.abs((actual - budgeted) / budgeted)
  return Math.round(clamp(100 * (1 - variance), 0, 100))
}

/**
 * Calculate overall monthly adherence score
 * Weighted by budget amount (larger categories matter more)
 */
export function calculateMonthlyAdherence(
  budgets: Array<{ category: string; amount: number }>,
  actuals: Map<string, number>
): { score: number; categoriesOnTrack: number; totalCategories: number } {
  if (budgets.length === 0) {
    return { score: 0, categoriesOnTrack: 0, totalCategories: 0 }
  }
  
  let totalWeight = 0
  let weightedScore = 0
  let onTrack = 0
  
  for (const budget of budgets) {
    const actual = actuals.get(budget.category) || 0
    const categoryScore = calculateCategoryAdherence(budget.amount, actual)
    
    // Weight by budget amount
    weightedScore += categoryScore * budget.amount
    totalWeight += budget.amount
    
    // Count as "on track" if score >= 70
    if (categoryScore >= 70) {
      onTrack++
    }
  }
  
  const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0
  
  return {
    score: Math.round(overallScore),
    categoriesOnTrack: onTrack,
    totalCategories: budgets.length,
  }
}

// ============================================================================
// ADHERENCE RATING
// ============================================================================

/**
 * Convert adherence score to rating
 */
export function getAdherenceRating(score: number): AdherenceRating {
  if (score >= ADHERENCE_EXCELLENT) return 'Excellent'
  if (score >= ADHERENCE_GOOD) return 'Good'
  if (score >= ADHERENCE_FAIR) return 'Fair'
  return 'Needs Improvement'
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Analyze adherence trend over time
 */
export function analyzeAdherenceTrend(
  history: AdherenceHistoryEntry[]
): {
  direction: 'improving' | 'stable' | 'declining' | 'insufficient'
  trendPercent: number | null
} {
  if (history.length < 3) {
    return { direction: 'insufficient', trendPercent: null }
  }
  
  // Compare first half to second half
  const midpoint = Math.floor(history.length / 2)
  const firstHalf = history.slice(0, midpoint).map(h => h.adherenceScore)
  const secondHalf = history.slice(midpoint).map(h => h.adherenceScore)
  
  const firstAvg = mean(firstHalf)
  const secondAvg = mean(secondHalf)
  
  if (firstAvg === 0) {
    return { direction: 'stable', trendPercent: null }
  }
  
  const changePercent = (secondAvg - firstAvg) / firstAvg
  
  if (changePercent >= ADHERENCE_TREND_IMPROVEMENT) {
    return { direction: 'improving', trendPercent: Math.round(changePercent * 100) }
  }
  if (changePercent <= ADHERENCE_TREND_DECLINE) {
    return { direction: 'declining', trendPercent: Math.round(changePercent * 100) }
  }
  
  return { direction: 'stable', trendPercent: Math.round(changePercent * 100) }
}

// ============================================================================
// PROBLEM CATEGORY IDENTIFICATION
// ============================================================================

export interface CategoryAdherenceHistory {
  category: string
  monthlyScores: Array<{ month: string; score: number; variance: number }>
}

/**
 * Calculate adherence history per category
 */
export function calculateCategoryHistory(
  transactions: TransactionInput[],
  budgets: Array<{ category: string; amount: number }>,
  months: string[]
): CategoryAdherenceHistory[] {
  const results: CategoryAdherenceHistory[] = []
  
  for (const budget of budgets) {
    const monthlyScores: Array<{ month: string; score: number; variance: number }> = []
    
    for (const month of months) {
      // Get transactions for this month and category
      const monthTxns = transactions.filter(t => {
        const txnMonth = getMonthKey(new Date(t.date))
        return txnMonth === month && t.category === budget.category && t.type === 'expense'
      })
      
      const actual = monthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const score = calculateCategoryAdherence(budget.amount, actual)
      const variance = budget.amount > 0 ? ((actual - budget.amount) / budget.amount) * 100 : 0
      
      monthlyScores.push({ month, score, variance })
    }
    
    results.push({ category: budget.category, monthlyScores })
  }
  
  return results
}

/**
 * Identify problem categories (consistently over budget)
 */
export function identifyProblemCategories(
  categoryHistory: CategoryAdherenceHistory[],
  minMonths = 3,
  problemThreshold = 20 // 20% over budget average
): Array<{
  category: string
  avgVariance: number
  timesOverBudget: number
  isConsistentOffender: boolean
}> {
  const problems: Array<{
    category: string
    avgVariance: number
    timesOverBudget: number
    isConsistentOffender: boolean
  }> = []
  
  for (const ch of categoryHistory) {
    if (ch.monthlyScores.length < minMonths) continue
    
    const variances = ch.monthlyScores.map(s => s.variance)
    const avgVariance = mean(variances)
    const timesOverBudget = ch.monthlyScores.filter(s => s.variance > 0).length
    const overBudgetRatio = timesOverBudget / ch.monthlyScores.length
    
    // Consistent offender = over budget > 50% of the time with > 20% average overage
    const isConsistentOffender = overBudgetRatio > 0.5 && avgVariance > problemThreshold
    
    if (avgVariance > 0) { // Only include if average is over budget
      problems.push({
        category: ch.category,
        avgVariance: Math.round(avgVariance * 10) / 10,
        timesOverBudget,
        isConsistentOffender,
      })
    }
  }
  
  // Sort by average variance (worst first)
  return problems.sort((a, b) => b.avgVariance - a.avgVariance)
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

/**
 * Generate insights based on adherence analysis
 */
export function generateAdherenceInsights(
  overallScore: number,
  trend: 'improving' | 'stable' | 'declining' | 'insufficient',
  problems: Array<{ category: string; avgVariance: number; isConsistentOffender: boolean }>
): string[] {
  const insights: string[] = []
  
  // Overall score insight
  if (overallScore >= ADHERENCE_EXCELLENT) {
    insights.push('Excellent budget discipline! You consistently stay close to your spending targets.')
  } else if (overallScore >= ADHERENCE_GOOD) {
    insights.push('Good budget management. Minor adjustments could improve consistency.')
  } else if (overallScore >= ADHERENCE_FAIR) {
    insights.push('Budget adherence needs attention. Consider reviewing your category allocations.')
  } else {
    insights.push('Budget adherence needs significant improvement. Consider starting with just 3-4 key categories.')
  }
  
  // Trend insight
  if (trend === 'improving') {
    insights.push('Great progress! Your budget adherence is improving over time.')
  } else if (trend === 'declining') {
    insights.push('Budget adherence has been declining. Review recent spending patterns.')
  }
  
  // Problem category insights
  const consistentOffenders = problems.filter(p => p.isConsistentOffender)
  if (consistentOffenders.length > 0) {
    const categories = consistentOffenders.slice(0, 3).map(p => p.category).join(', ')
    insights.push(`Chronic overspending in: ${categories}. Consider increasing these budgets or finding ways to reduce spending.`)
  }
  
  // Top problem category
  if (problems.length > 0 && problems[0]!.avgVariance > 50) {
    insights.push(`${problems[0]!.category} is ${problems[0]!.avgVariance.toFixed(0)}% over budget on average. This is your biggest opportunity for improvement.`)
  }
  
  return insights
}

// ============================================================================
// MAIN ADHERENCE ANALYSIS
// ============================================================================

export interface AdherenceAnalysisOptions {
  budgets: Array<{ category: string; amount: number }>
  lookbackMonths?: number
}

/**
 * Complete budget adherence analysis
 */
export function analyzeAdherence(
  transactions: TransactionInput[],
  options: AdherenceAnalysisOptions
): AdherenceAnalysisResult {
  const { budgets, lookbackMonths = 6 } = options
  
  if (budgets.length === 0) {
    return {
      overallScore: 0,
      rating: 'Needs Improvement',
      trend: 'insufficient',
      trendPercent: null,
      history: [],
      problemCategories: [],
      insights: ['No budgets configured. Set up category budgets to track adherence.'],
    }
  }
  
  // Get unique months from transactions
  const monthSet = new Set<string>()
  for (const t of transactions) {
    monthSet.add(getMonthKey(new Date(t.date)))
  }
  const months = Array.from(monthSet).sort().slice(-lookbackMonths)
  
  if (months.length === 0) {
    return {
      overallScore: 0,
      rating: 'Needs Improvement',
      trend: 'insufficient',
      trendPercent: null,
      history: [],
      problemCategories: [],
      insights: ['No transaction history. Add transactions to analyze budget adherence.'],
    }
  }
  
  // Calculate monthly adherence history
  const history: AdherenceHistoryEntry[] = []
  
  for (const month of months) {
    const monthTxns = transactions.filter(t => {
      const txnMonth = getMonthKey(new Date(t.date))
      return txnMonth === month && t.type === 'expense'
    })
    
    const actuals = aggregateByCategory(monthTxns, 'expense')
    const { score, categoriesOnTrack, totalCategories } = calculateMonthlyAdherence(budgets, actuals)
    
    history.push({
      month,
      adherenceScore: score,
      categoriesOnTrack,
      totalCategories,
    })
  }
  
  // Calculate overall score (average of recent months)
  const recentScores = history.slice(-3).map(h => h.adherenceScore)
  const overallScore = Math.round(mean(recentScores))
  const rating = getAdherenceRating(overallScore)
  
  // Analyze trend
  const { direction: trend, trendPercent } = analyzeAdherenceTrend(history)
  
  // Identify problem categories
  const categoryHistory = calculateCategoryHistory(transactions, budgets, months)
  const problemCategories = identifyProblemCategories(categoryHistory)
  
  // Generate insights
  const insights = generateAdherenceInsights(overallScore, trend, problemCategories)
  
  return {
    overallScore,
    rating,
    trend,
    trendPercent,
    history,
    problemCategories,
    insights,
  }
}
