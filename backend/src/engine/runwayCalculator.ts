/**
 * Financial Runway & Burn Rate Calculator (Feature #6)
 * 
 * Estimate how long current cash reserves last and identify when intervention is needed.
 * Used for job-loss planning, emergency fund adequacy, and debt management priority.
 * 
 * Source: Wall Street Prep, CFP emergency fund guidance
 */

import type {
  TransactionInput,
  RunwayResult,
  RunwayScenario,
  RunwayStatus,
  MonthlyAggregate,
} from './types.js'
import {
  RUNWAY_CRITICAL,
  RUNWAY_CAUTION,
  RUNWAY_ADEQUATE,
  RUNWAY_INCOME_LOSS_FACTOR,
  RUNWAY_EXPENSE_REDUCTION,
} from './constants.js'
import {
  mean,
  getSortedMonthlyAggregates,
  addMonths,
} from './utils.js'

// ============================================================================
// BURN RATE CALCULATIONS
// ============================================================================

/**
 * Calculate gross burn rate (total expenses per month)
 */
export function calculateGrossBurnRate(monthlyExpenses: number[]): number {
  if (monthlyExpenses.length === 0) return 0
  return mean(monthlyExpenses)
}

/**
 * Calculate net burn rate (expenses - income per month)
 * Negative = surplus (income > expenses)
 * Positive = deficit (expenses > income)
 */
export function calculateNetBurnRate(monthlyIncome: number[], monthlyExpenses: number[]): number {
  if (monthlyExpenses.length === 0) return 0
  
  const avgExpenses = mean(monthlyExpenses)
  const avgIncome = mean(monthlyIncome)
  
  return avgExpenses - avgIncome
}

// ============================================================================
// RUNWAY CALCULATIONS
// ============================================================================

/**
 * Calculate runway in months
 * Returns null if burn rate is 0 or negative (sustainable indefinitely)
 */
export function calculateRunway(cashOnHand: number, netBurnRate: number): number | null {
  // If net burn rate is negative or zero, income covers expenses
  if (netBurnRate <= 0) return null
  
  // If no cash, runway is 0
  if (cashOnHand <= 0) return 0
  
  return cashOnHand / netBurnRate
}

/**
 * Classify runway status based on months remaining
 */
export function classifyRunwayStatus(months: number | null): RunwayStatus {
  if (months === null) return 'surplus'
  if (months === 0) return 'critical'
  if (months < RUNWAY_CRITICAL) return 'critical'
  if (months < RUNWAY_CAUTION) return 'caution'
  if (months < RUNWAY_ADEQUATE) return 'adequate'
  return 'comfortable'
}

/**
 * Calculate depletion date from runway months
 */
export function calculateDepletionDate(runwayMonths: number | null): Date | null {
  if (runwayMonths === null) return null
  return addMonths(new Date(), Math.ceil(runwayMonths))
}

// ============================================================================
// SCENARIO MODELING
// ============================================================================

/**
 * Generate runway scenario
 */
function createScenario(
  name: string,
  cashOnHand: number,
  adjustedBurnRate: number
): RunwayScenario {
  const runwayMonths = calculateRunway(cashOnHand, adjustedBurnRate)
  
  return {
    name,
    runwayMonths: runwayMonths !== null ? Math.round(runwayMonths * 10) / 10 : null,
    status: classifyRunwayStatus(runwayMonths),
    burnRate: Math.round(adjustedBurnRate * 100) / 100,
    depletionDate: calculateDepletionDate(runwayMonths),
  }
}

/**
 * Run multiple runway scenarios
 */
export function runScenarios(
  cashOnHand: number,
  avgIncome: number,
  avgExpenses: number,
  options: {
    incomeLossFactor?: number
    expenseReductionFactor?: number
  } = {}
): {
  base: RunwayScenario
  conservative: RunwayScenario
  best: RunwayScenario
} {
  const {
    incomeLossFactor = RUNWAY_INCOME_LOSS_FACTOR,
    expenseReductionFactor = RUNWAY_EXPENSE_REDUCTION,
  } = options
  
  // Base scenario: Current net burn rate
  const baseBurnRate = avgExpenses - avgIncome
  const base = createScenario('Base Case', cashOnHand, baseBurnRate)
  
  // Conservative scenario: Assume income loss (e.g., job loss or reduction)
  const conservativeIncome = avgIncome * (1 - incomeLossFactor)
  const conservativeBurnRate = avgExpenses - conservativeIncome
  const conservative = createScenario(
    `${(incomeLossFactor * 100).toFixed(0)}% Income Loss`,
    cashOnHand,
    conservativeBurnRate
  )
  
  // Best case scenario: Expenses reduced
  const bestExpenses = avgExpenses * (1 - expenseReductionFactor)
  const bestBurnRate = bestExpenses - avgIncome
  const best = createScenario(
    `${(expenseReductionFactor * 100).toFixed(0)}% Expense Reduction`,
    cashOnHand,
    bestBurnRate
  )
  
  return { base, conservative, best }
}

// ============================================================================
// BURN TREND ANALYSIS
// ============================================================================

/**
 * Analyze burn rate trend over time
 */
export function analyzeBurnTrend(
  monthlyAggregates: MonthlyAggregate[]
): 'accelerating' | 'stable' | 'improving' {
  if (monthlyAggregates.length < 3) return 'stable'
  
  // Calculate net burn for each month
  const monthlyBurns = monthlyAggregates.map(m => m.expenses - m.income)
  
  // Compare first half to second half
  const midpoint = Math.floor(monthlyBurns.length / 2)
  const firstHalf = monthlyBurns.slice(0, midpoint)
  const secondHalf = monthlyBurns.slice(midpoint)
  
  const firstAvg = mean(firstHalf)
  const secondAvg = mean(secondHalf)
  
  // Calculate change
  if (Math.abs(firstAvg) < 0.01) return 'stable'
  
  const change = (secondAvg - firstAvg) / Math.abs(firstAvg)
  
  if (change > 0.1) return 'accelerating' // Burn increasing (bad)
  if (change < -0.1) return 'improving' // Burn decreasing (good)
  return 'stable'
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate recommendation based on runway analysis
 */
export function generateRunwayRecommendation(
  baseRunway: number | null,
  burnTrend: 'accelerating' | 'stable' | 'improving'
): string {
  if (baseRunway === null) {
    return 'Excellent: Positive cash flow. Focus on goal funding and investment.'
  }
  
  if (baseRunway === 0) {
    return 'URGENT: No cash reserves. Immediate action required to reduce expenses or increase income.'
  }
  
  if (baseRunway < RUNWAY_CRITICAL) {
    if (burnTrend === 'accelerating') {
      return 'CRITICAL: Runway is very short and burn is accelerating. Cut non-essential expenses immediately and consider additional income sources.'
    }
    return 'CRITICAL: Runway is very short. Cut expenses or increase income immediately. Build emergency fund urgently.'
  }
  
  if (baseRunway < RUNWAY_CAUTION) {
    if (burnTrend === 'improving') {
      return 'CAUTION: Limited runway, but improving. Continue cost reduction efforts and build reserves.'
    }
    return 'CAUTION: Consider cost reduction or income boost within 3-6 months. Prioritize building emergency fund.'
  }
  
  if (baseRunway < RUNWAY_ADEQUATE) {
    return 'ADEQUATE: Monitor monthly. Consider building runway to 12+ months for better security.'
  }
  
  return 'COMFORTABLE: Strong runway. Continue monitoring quarterly while focusing on longer-term goals.'
}

// ============================================================================
// MAIN RUNWAY ANALYSIS
// ============================================================================

export interface RunwayAnalysisOptions {
  cashOnHand: number
  incomeLossFactor?: number
  expenseReductionFactor?: number
  lookbackMonths?: number
}

/**
 * Complete runway analysis
 */
export function analyzeRunway(
  transactions: TransactionInput[],
  options: RunwayAnalysisOptions
): RunwayResult {
  const {
    cashOnHand,
    incomeLossFactor = RUNWAY_INCOME_LOSS_FACTOR,
    expenseReductionFactor = RUNWAY_EXPENSE_REDUCTION,
    lookbackMonths = 6,
  } = options
  
  // Get monthly aggregates
  const monthlyAggregates = getSortedMonthlyAggregates(transactions)
  
  // Use only last N months
  const recentMonths = monthlyAggregates.slice(-lookbackMonths)
  
  if (recentMonths.length === 0) {
    return {
      cashOnHand,
      grossBurnRate: 0,
      netBurnRate: 0,
      scenarios: {
        base: createScenario('Base Case', cashOnHand, 0),
        conservative: createScenario('Conservative', cashOnHand, 0),
        best: createScenario('Best Case', cashOnHand, 0),
      },
      burnTrend: 'stable',
      recommendation: 'Insufficient data to calculate runway. Add transaction history.',
    }
  }
  
  // Calculate averages
  const avgIncome = mean(recentMonths.map(m => m.income))
  const avgExpenses = mean(recentMonths.map(m => m.expenses))
  
  // Calculate burn rates
  const grossBurnRate = avgExpenses
  const netBurnRate = avgExpenses - avgIncome
  
  // Run scenarios
  const scenarios = runScenarios(cashOnHand, avgIncome, avgExpenses, {
    incomeLossFactor,
    expenseReductionFactor,
  })
  
  // Analyze trend
  const burnTrend = analyzeBurnTrend(recentMonths)
  
  // Generate recommendation
  const recommendation = generateRunwayRecommendation(scenarios.base.runwayMonths, burnTrend)
  
  return {
    cashOnHand,
    grossBurnRate: Math.round(grossBurnRate * 100) / 100,
    netBurnRate: Math.round(netBurnRate * 100) / 100,
    scenarios,
    burnTrend,
    recommendation,
  }
}

// ============================================================================
// ZERO INCOME SCENARIO (Job Loss)
// ============================================================================

/**
 * Calculate runway assuming complete income loss (job loss scenario)
 */
export function calculateJobLossRunway(
  cashOnHand: number,
  monthlyEssentialExpenses: number
): {
  runwayMonths: number
  depletionDate: Date
  recommendation: string
} {
  const runwayMonths = cashOnHand / monthlyEssentialExpenses
  const depletionDate = addMonths(new Date(), Math.ceil(runwayMonths))
  
  let recommendation: string
  if (runwayMonths < 3) {
    recommendation = 'CRITICAL: Less than 3 months runway without income. Build emergency fund immediately.'
  } else if (runwayMonths < 6) {
    recommendation = 'CAUTION: 3-6 months runway. Aim for at least 6 months of essential expenses.'
  } else if (runwayMonths < 12) {
    recommendation = 'ADEQUATE: 6-12 months runway. Consider building to 12 months for variable income.'
  } else {
    recommendation = 'COMFORTABLE: 12+ months runway. Strong emergency fund position.'
  }
  
  return {
    runwayMonths: Math.round(runwayMonths * 10) / 10,
    depletionDate,
    recommendation,
  }
}
