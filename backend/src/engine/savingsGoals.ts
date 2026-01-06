/**
 * Savings Rate & Goal Progress Engine (Feature #7)
 * 
 * Monitor savings rate with auto-allocation hints for named goals.
 * Tracks progress and provides projections for goal completion.
 * 
 * Source: CFP savings benchmarks, YNAB goal-setting methodology
 */

import type {
  TransactionInput,
  GoalProgressResult,
  GoalStatus,
  SavingsAnalysis,
  MonthlyAggregate,
} from './types.js'
import {
  SAVINGS_RATE_TARGET,
  SAVINGS_RATE_LOW,
  SAVINGS_RATE_EXCELLENT,
} from './constants.js'
import {
  mean,
  getSortedMonthlyAggregates,
  addMonths,
  daysBetween,
} from './utils.js'

// ============================================================================
// SAVINGS RATE CALCULATIONS
// ============================================================================

/**
 * Calculate savings rate
 * Formula: (Income − Expenses) / Income × 100
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0
  const savings = income - expenses
  return (savings / income) * 100
}

/**
 * Get savings rate rating
 */
export function rateSavingsRate(rate: number): {
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'
  explanation: string
} {
  if (rate >= SAVINGS_RATE_EXCELLENT * 100) {
    return {
      rating: 'Excellent',
      explanation: `Saving ${rate.toFixed(1)}% - well above the recommended ${(SAVINGS_RATE_TARGET * 100).toFixed(0)}%.`,
    }
  }
  if (rate >= SAVINGS_RATE_TARGET * 100) {
    return {
      rating: 'Good',
      explanation: `Saving ${rate.toFixed(1)}% - meeting the recommended ${(SAVINGS_RATE_TARGET * 100).toFixed(0)}% target.`,
    }
  }
  if (rate >= SAVINGS_RATE_LOW * 100) {
    return {
      rating: 'Fair',
      explanation: `Saving ${rate.toFixed(1)}% - below the recommended ${(SAVINGS_RATE_TARGET * 100).toFixed(0)}%. Consider reducing discretionary spending.`,
    }
  }
  if (rate > 0) {
    return {
      rating: 'Needs Improvement',
      explanation: `Saving ${rate.toFixed(1)}% - significantly below recommended. Review budget for savings opportunities.`,
    }
  }
  return {
    rating: 'Needs Improvement',
    explanation: 'Currently not saving (expenses exceed income). Address spending or increase income.',
  }
}

// ============================================================================
// GOAL PROGRESS CALCULATIONS
// ============================================================================

export interface GoalInput {
  id: number
  name: string
  targetAmount: number
  currentSaved: number
  targetDate: Date
  priority: number
}

/**
 * Calculate progress percentage for a goal
 */
export function calculateGoalProgress(currentSaved: number, targetAmount: number): number {
  if (targetAmount <= 0) return 100
  return Math.min(100, (currentSaved / targetAmount) * 100)
}

/**
 * Calculate months to completion given monthly contribution
 */
export function calculateMonthsToCompletion(
  currentSaved: number,
  targetAmount: number,
  monthlyContribution: number
): number | null {
  if (currentSaved >= targetAmount) return 0
  if (monthlyContribution <= 0) return null
  
  const remaining = targetAmount - currentSaved
  return Math.ceil(remaining / monthlyContribution)
}

/**
 * Project completion date based on current contribution rate
 */
export function projectCompletionDate(
  monthsToCompletion: number | null
): Date | null {
  if (monthsToCompletion === null) return null
  if (monthsToCompletion === 0) return new Date()
  return addMonths(new Date(), monthsToCompletion)
}

/**
 * Determine goal status
 */
export function determineGoalStatus(
  goal: GoalInput,
  projectedCompletionDate: Date | null
): GoalStatus {
  const now = new Date()
  
  // Already achieved
  if (goal.currentSaved >= goal.targetAmount) return 'achieved'
  
  // Past due date
  if (goal.targetDate < now) return 'overdue'
  
  // Check if on track
  if (projectedCompletionDate === null) return 'off_track'
  if (projectedCompletionDate <= goal.targetDate) return 'on_track'
  
  return 'off_track'
}

/**
 * Calculate required monthly contribution to meet goal by target date
 */
export function calculateRequiredMonthlyContribution(
  goal: GoalInput
): number {
  if (goal.currentSaved >= goal.targetAmount) return 0
  
  const now = new Date()
  const monthsRemaining = Math.max(1, Math.ceil(
    (goal.targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)
  ))
  
  const remaining = goal.targetAmount - goal.currentSaved
  return remaining / monthsRemaining
}

// ============================================================================
// GOAL ALLOCATION
// ============================================================================

/**
 * Allocate savings to goals based on priority
 * Higher priority goals get funded first
 */
export function allocateSavingsToGoals(
  monthlySavings: number,
  goals: GoalInput[]
): Array<{ goalId: number; allocation: number }> {
  if (monthlySavings <= 0 || goals.length === 0) {
    return goals.map(g => ({ goalId: g.id, allocation: 0 }))
  }
  
  // Sort by priority (1 = highest)
  const sortedGoals = [...goals]
    .filter(g => g.currentSaved < g.targetAmount)
    .sort((a, b) => a.priority - b.priority)
  
  let remainingSavings = monthlySavings
  const allocations: Array<{ goalId: number; allocation: number }> = []
  
  for (const goal of sortedGoals) {
    // Calculate what this goal needs
    const required = calculateRequiredMonthlyContribution(goal)
    
    // Allocate what we can
    const allocation = Math.min(required, remainingSavings)
    allocations.push({ goalId: goal.id, allocation })
    
    remainingSavings -= allocation
    if (remainingSavings <= 0) break
  }
  
  // Add zero allocations for remaining goals
  for (const goal of sortedGoals) {
    if (!allocations.find(a => a.goalId === goal.id)) {
      allocations.push({ goalId: goal.id, allocation: 0 })
    }
  }
  
  return allocations
}

// ============================================================================
// GOAL PROGRESS ANALYSIS
// ============================================================================

/**
 * Analyze progress for a single goal
 */
export function analyzeGoalProgress(
  goal: GoalInput,
  monthlyContribution: number
): GoalProgressResult {
  const progress = calculateGoalProgress(goal.currentSaved, goal.targetAmount)
  const monthsToCompletion = calculateMonthsToCompletion(
    goal.currentSaved,
    goal.targetAmount,
    monthlyContribution
  )
  const projectedDate = projectCompletionDate(monthsToCompletion)
  const status = determineGoalStatus(goal, projectedDate)
  
  let monthsOverdue: number | null = null
  if (status === 'overdue') {
    const now = new Date()
    monthsOverdue = Math.ceil(
      (now.getTime() - goal.targetDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    )
  }
  
  return {
    goalId: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentSaved: goal.currentSaved,
    progressPercent: Math.round(progress * 10) / 10,
    monthlyAllocation: monthlyContribution,
    monthsToCompletion,
    projectedCompletionDate: projectedDate,
    status,
    monthsOverdue,
  }
}

// ============================================================================
// MAIN SAVINGS ANALYSIS
// ============================================================================

export interface SavingsAnalysisOptions {
  goals?: GoalInput[]
  lookbackMonths?: number
}

/**
 * Complete savings rate and goals analysis
 */
export function analyzeSavings(
  transactions: TransactionInput[],
  options: SavingsAnalysisOptions = {}
): SavingsAnalysis {
  const { goals = [], lookbackMonths = 6 } = options
  
  // Get monthly aggregates
  const allMonthly = getSortedMonthlyAggregates(transactions)
  const recentMonths = allMonthly.slice(-lookbackMonths)
  
  if (recentMonths.length === 0) {
    return {
      savingsRate: 0,
      totalSavings: 0,
      monthlyAverageSavings: 0,
      goals: [],
      recommendation: 'Add transaction history to calculate savings rate.',
    }
  }
  
  // Calculate savings metrics
  const totalIncome = recentMonths.reduce((sum, m) => sum + m.income, 0)
  const totalExpenses = recentMonths.reduce((sum, m) => sum + m.expenses, 0)
  const totalSavings = totalIncome - totalExpenses
  const monthlyAverageSavings = totalSavings / recentMonths.length
  
  const savingsRate = calculateSavingsRate(
    totalIncome / recentMonths.length,
    totalExpenses / recentMonths.length
  )
  
  // Allocate savings to goals
  const allocations = allocateSavingsToGoals(
    Math.max(0, monthlyAverageSavings),
    goals
  )
  
  // Analyze each goal
  const goalProgress: GoalProgressResult[] = goals.map(goal => {
    const allocation = allocations.find(a => a.goalId === goal.id)?.allocation || 0
    return analyzeGoalProgress(goal, allocation)
  })
  
  // Generate recommendation
  const { rating, explanation } = rateSavingsRate(savingsRate)
  let recommendation = explanation
  
  if (goals.length > 0) {
    const offTrackGoals = goalProgress.filter(g => g.status === 'off_track')
    if (offTrackGoals.length > 0) {
      recommendation += ` ${offTrackGoals.length} goal(s) are off track - consider increasing savings or adjusting timelines.`
    }
  }
  
  return {
    savingsRate: Math.round(savingsRate * 10) / 10,
    totalSavings: Math.round(totalSavings * 100) / 100,
    monthlyAverageSavings: Math.round(monthlyAverageSavings * 100) / 100,
    goals: goalProgress,
    recommendation,
  }
}

// ============================================================================
// GOAL PROJECTIONS
// ============================================================================

/**
 * Project goal outcomes under different savings scenarios
 */
export function projectGoalScenarios(
  goal: GoalInput,
  currentMonthlySavings: number
): {
  current: GoalProgressResult
  increasedBy10: GoalProgressResult
  increasedBy25: GoalProgressResult
  required: number
} {
  return {
    current: analyzeGoalProgress(goal, currentMonthlySavings),
    increasedBy10: analyzeGoalProgress(goal, currentMonthlySavings * 1.1),
    increasedBy25: analyzeGoalProgress(goal, currentMonthlySavings * 1.25),
    required: calculateRequiredMonthlyContribution(goal),
  }
}
