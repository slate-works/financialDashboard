/**
 * Adaptive Budget Recommendations Engine (Feature #10)
 * 
 * Suggest budget reallocation if historic spending consistently deviates from targets.
 * Uses spending trends and goal requirements to provide actionable recommendations.
 * 
 * Source: YNAB methodology, CFP financial planning
 */

import type {
  TransactionInput,
  BudgetRecommendation,
  AdaptiveBudgetResult,
  ConfidenceLevel,
} from './types.js'
import {
  ADAPTIVE_TREND_THRESHOLD,
  ADAPTIVE_HIGH_CONFIDENCE_CV,
  ADAPTIVE_MEDIUM_CONFIDENCE_CV,
} from './constants.js'
import {
  mean,
  coefficientOfVariation,
  getMonthlyAmountsForCategory,
  clamp,
} from './utils.js'

// ============================================================================
// SPENDING TREND ANALYSIS
// ============================================================================

export interface SpendingTrend {
  avgMonthly: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercent: number
  cv: number | null
  monthCount: number
}

/**
 * Analyze spending trend for a category
 */
export function analyzeSpendingTrend(
  transactions: TransactionInput[],
  category: string,
  lookbackMonths = 6
): SpendingTrend {
  const monthlyData = getMonthlyAmountsForCategory(transactions, category)
  const recent = monthlyData.slice(-lookbackMonths)
  const amounts = recent.map(d => d.amount)
  
  if (amounts.length === 0) {
    return {
      avgMonthly: 0,
      trend: 'stable',
      trendPercent: 0,
      cv: null,
      monthCount: 0,
    }
  }
  
  const avg = mean(amounts)
  const cv = coefficientOfVariation(amounts)
  
  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  let trendPercent = 0
  
  if (amounts.length >= 3) {
    const midpoint = Math.floor(amounts.length / 2)
    const firstHalf = mean(amounts.slice(0, midpoint))
    const secondHalf = mean(amounts.slice(midpoint))
    
    if (firstHalf > 0) {
      trendPercent = ((secondHalf - firstHalf) / firstHalf) * 100
      
      if (trendPercent > ADAPTIVE_TREND_THRESHOLD * 100) {
        trend = 'increasing'
      } else if (trendPercent < -ADAPTIVE_TREND_THRESHOLD * 100) {
        trend = 'decreasing'
      }
    }
  }
  
  return {
    avgMonthly: Math.round(avg * 100) / 100,
    trend,
    trendPercent: Math.round(trendPercent),
    cv,
    monthCount: amounts.length,
  }
}

// ============================================================================
// CONFIDENCE ASSESSMENT
// ============================================================================

/**
 * Determine recommendation confidence based on data quality
 */
export function assessRecommendationConfidence(
  cv: number | null,
  monthCount: number
): ConfidenceLevel {
  if (monthCount < 3) return 'insufficient'
  if (cv === null) return 'low'
  
  if (cv < ADAPTIVE_HIGH_CONFIDENCE_CV && monthCount >= 6) {
    return 'high'
  }
  if (cv < ADAPTIVE_MEDIUM_CONFIDENCE_CV && monthCount >= 3) {
    return 'medium'
  }
  return 'low'
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate budget recommendation for a single category
 */
export function generateCategoryRecommendation(
  category: string,
  currentBudget: number,
  spendingTrend: SpendingTrend,
  savingsGoalAdjustment?: number
): BudgetRecommendation | null {
  const { avgMonthly, trend, trendPercent, cv, monthCount } = spendingTrend
  
  // Skip if insufficient data
  if (monthCount < 3) {
    return null
  }
  
  // Calculate recommended budget
  let recommendedBudget: number
  let reason: string
  let risk: string | null = null
  
  // Case 1: Consistently over budget (spending > budget by > 15%)
  if (avgMonthly > currentBudget * 1.15) {
    // Recommend increasing budget toward actual spending
    recommendedBudget = Math.ceil(avgMonthly / 10) * 10 // Round up to nearest $10
    reason = `Consistently overspending by ~${Math.round(((avgMonthly / currentBudget) - 1) * 100)}%. Recommend adjusting to realistic level.`
    risk = 'Increasing this budget may reduce savings. Consider if spending can be reduced instead.'
  }
  // Case 2: Consistently under budget (spending < budget by > 20%)
  else if (avgMonthly < currentBudget * 0.8) {
    // Recommend decreasing budget
    recommendedBudget = Math.ceil(avgMonthly * 1.1 / 10) * 10 // 10% buffer, rounded
    reason = `Underspending by ~${Math.round((1 - (avgMonthly / currentBudget)) * 100)}%. Budget can be reallocated.`
  }
  // Case 3: Increasing trend
  else if (trend === 'increasing' && trendPercent > 10) {
    recommendedBudget = Math.ceil(avgMonthly * 1.1 / 10) * 10 // 10% above current average
    reason = `Spending trending up ${trendPercent}%. Budget adjusted proactively.`
    risk = 'Consider if this increase is temporary or represents lifestyle creep.'
  }
  // Case 4: Decreasing trend
  else if (trend === 'decreasing' && trendPercent < -10) {
    recommendedBudget = Math.ceil(avgMonthly * 1.05 / 10) * 10 // Small buffer above current
    reason = `Spending trending down ${Math.abs(trendPercent)}%. Budget can be reduced.`
  }
  // Case 5: On track - no change needed
  else {
    return null
  }
  
  // Apply savings goal adjustment if provided
  if (savingsGoalAdjustment && savingsGoalAdjustment < 0) {
    // Goal requires reducing spending
    const reducedBudget = recommendedBudget + savingsGoalAdjustment
    if (reducedBudget > avgMonthly * 0.8) {
      recommendedBudget = Math.ceil(reducedBudget / 10) * 10
      reason += ` Additionally adjusted by $${Math.abs(savingsGoalAdjustment).toFixed(0)} to meet savings goals.`
    }
  }
  
  const changePercent = currentBudget > 0 
    ? ((recommendedBudget - currentBudget) / currentBudget) * 100 
    : 100
  
  // Skip if change is minimal (< 5%)
  if (Math.abs(changePercent) < 5) {
    return null
  }
  
  return {
    category,
    currentBudget,
    recommendedBudget,
    changePercent: Math.round(changePercent),
    reason,
    confidence: assessRecommendationConfidence(cv, monthCount),
    risk,
  }
}

// ============================================================================
// GOAL-BASED ADJUSTMENT
// ============================================================================

/**
 * Calculate how much spending needs to be reduced to meet savings goals
 */
export function calculateGoalAdjustment(
  currentMonthlySavings: number,
  targetMonthlySavings: number,
  discretionaryCategories: Array<{ category: string; budget: number; avgSpend: number }>
): Map<string, number> {
  const adjustments = new Map<string, number>()
  
  const shortfall = targetMonthlySavings - currentMonthlySavings
  if (shortfall <= 0) {
    // Already meeting goal
    return adjustments
  }
  
  // Calculate total discretionary slack (budget - avg spend where spend < budget)
  const slack = discretionaryCategories
    .filter(c => c.avgSpend < c.budget)
    .reduce((sum, c) => sum + (c.budget - c.avgSpend), 0)
  
  // If slack covers shortfall, just reallocate
  if (slack >= shortfall) {
    return adjustments // No cuts needed, just reallocate unused budget
  }
  
  // Need actual cuts - distribute proportionally
  const remainingShortfall = shortfall - slack
  const totalDiscretionary = discretionaryCategories.reduce((sum, c) => sum + c.budget, 0)
  
  for (const cat of discretionaryCategories) {
    const proportion = cat.budget / totalDiscretionary
    const cut = Math.round(remainingShortfall * proportion)
    adjustments.set(cat.category, -cut)
  }
  
  return adjustments
}

// ============================================================================
// MAIN ADAPTIVE BUDGET ANALYSIS
// ============================================================================

export interface AdaptiveBudgetOptions {
  budgets: Array<{ category: string; amount: number }>
  targetMonthlySavings?: number
  lookbackMonths?: number
  discretionaryCategories?: string[]
}

/**
 * Generate adaptive budget recommendations
 */
export function generateAdaptiveBudget(
  transactions: TransactionInput[],
  options: AdaptiveBudgetOptions
): AdaptiveBudgetResult {
  const {
    budgets,
    targetMonthlySavings,
    lookbackMonths = 6,
    discretionaryCategories = ['Dining', 'Entertainment', 'Shopping', 'Hobbies'],
  } = options
  
  if (budgets.length === 0) {
    return {
      recommendations: [],
      totalCurrentBudget: 0,
      totalRecommendedBudget: 0,
      projectedSavingsImpact: 0,
      warnings: ['No budgets configured. Set up category budgets first.'],
    }
  }
  
  const recommendations: BudgetRecommendation[] = []
  const warnings: string[] = []
  
  // Calculate current total budget and average spending
  let totalCurrentBudget = 0
  let totalAvgSpending = 0
  
  // Analyze each category
  for (const budget of budgets) {
    totalCurrentBudget += budget.amount
    
    const trend = analyzeSpendingTrend(transactions, budget.category, lookbackMonths)
    totalAvgSpending += trend.avgMonthly
    
    const recommendation = generateCategoryRecommendation(
      budget.category,
      budget.amount,
      trend
    )
    
    if (recommendation) {
      recommendations.push(recommendation)
    }
    
    // Add warning for high volatility categories
    if (trend.cv !== null && trend.cv > 0.5) {
      warnings.push(`${budget.category} has highly variable spending (CV: ${Math.round(trend.cv * 100)}%). Consider breaking into sub-categories.`)
    }
  }
  
  // Calculate savings-based adjustments if target provided
  if (targetMonthlySavings !== undefined) {
    const currentMonthlySavings = totalCurrentBudget - totalAvgSpending
    
    if (currentMonthlySavings < targetMonthlySavings) {
      // Need to find additional savings
      const discretionary = budgets
        .filter(b => discretionaryCategories.includes(b.category))
        .map(b => {
          const trend = analyzeSpendingTrend(transactions, b.category, lookbackMonths)
          return {
            category: b.category,
            budget: b.amount,
            avgSpend: trend.avgMonthly,
          }
        })
      
      const goalAdjustments = calculateGoalAdjustment(
        currentMonthlySavings,
        targetMonthlySavings,
        discretionary
      )
      
      // Apply goal adjustments to recommendations
      for (const [category, adjustment] of goalAdjustments) {
        const existing = recommendations.find(r => r.category === category)
        if (existing) {
          existing.recommendedBudget += adjustment
          existing.reason += ` (includes savings goal adjustment)`
        } else {
          const budget = budgets.find(b => b.category === category)
          if (budget) {
            recommendations.push({
              category,
              currentBudget: budget.amount,
              recommendedBudget: budget.amount + adjustment,
              changePercent: Math.round((adjustment / budget.amount) * 100),
              reason: `Reduced to meet savings goal of $${targetMonthlySavings}/month.`,
              confidence: 'medium',
              risk: 'May require lifestyle adjustments.',
            })
          }
        }
      }
      
      warnings.push(`Current projected savings ($${Math.round(currentMonthlySavings)}/mo) is below target ($${targetMonthlySavings}/mo). Recommendations include adjustments to help bridge the gap.`)
    }
  }
  
  // Calculate totals
  let totalRecommendedBudget = totalCurrentBudget
  for (const rec of recommendations) {
    totalRecommendedBudget += (rec.recommendedBudget - rec.currentBudget)
  }
  
  const projectedSavingsImpact = totalCurrentBudget - totalRecommendedBudget
  
  // Sort recommendations by absolute change (biggest changes first)
  recommendations.sort((a, b) => 
    Math.abs(b.recommendedBudget - b.currentBudget) - Math.abs(a.recommendedBudget - a.currentBudget)
  )
  
  return {
    recommendations,
    totalCurrentBudget: Math.round(totalCurrentBudget * 100) / 100,
    totalRecommendedBudget: Math.round(totalRecommendedBudget * 100) / 100,
    projectedSavingsImpact: Math.round(projectedSavingsImpact * 100) / 100,
    warnings,
  }
}

// ============================================================================
// QUICK WINS IDENTIFICATION
// ============================================================================

/**
 * Identify categories with easy savings potential
 * (Consistently under budget with low variance)
 */
export function identifyQuickWins(
  transactions: TransactionInput[],
  budgets: Array<{ category: string; amount: number }>,
  minSavings = 20
): Array<{
  category: string
  potentialSavings: number
  confidence: ConfidenceLevel
}> {
  const quickWins: Array<{
    category: string
    potentialSavings: number
    confidence: ConfidenceLevel
  }> = []
  
  for (const budget of budgets) {
    const trend = analyzeSpendingTrend(transactions, budget.category)
    
    if (trend.monthCount < 3) continue
    
    // Must be consistently under budget
    const savings = budget.amount - trend.avgMonthly
    if (savings < minSavings) continue
    
    // Must have low variance (consistent spending)
    if (trend.cv !== null && trend.cv > 0.3) continue
    
    quickWins.push({
      category: budget.category,
      potentialSavings: Math.round(savings * 100) / 100,
      confidence: assessRecommendationConfidence(trend.cv, trend.monthCount),
    })
  }
  
  return quickWins.sort((a, b) => b.potentialSavings - a.potentialSavings)
}
