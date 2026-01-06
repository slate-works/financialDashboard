/**
 * Investment Simulator Engine (Feature #11)
 * 
 * Monte Carlo projections for retirement or goal funding.
 * Provides probability-based outcomes for investment portfolios.
 * 
 * IMPORTANT: Includes prominent disclaimer for educational purposes only.
 * 
 * Source: Investopedia Monte Carlo guide, IBKR portfolio analysis
 */

import type {
  PortfolioInput,
  SimulationResult,
} from './types.js'
import {
  MONTE_CARLO_SIMULATIONS,
  TRADING_DAYS_PER_YEAR,
} from './constants.js'
import { percentile } from './utils.js'

// ============================================================================
// DISCLAIMER
// ============================================================================

export const INVESTMENT_DISCLAIMER = `
IMPORTANT DISCLAIMER: This simulation is for educational and planning purposes only.
It does not constitute financial advice. Past performance does not guarantee future results.
Actual returns may vary significantly from projections. Consider consulting a licensed
financial advisor before making investment decisions.
`

// ============================================================================
// STATISTICAL DISTRIBUTIONS
// ============================================================================

/**
 * Generate random number from standard normal distribution
 * Using Box-Muller transform
 */
export function randomNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Generate random number from normal distribution with given mean and stdDev
 */
export function randomNormalWithParams(mean: number, stdDev: number): number {
  return mean + stdDev * randomNormal()
}

// ============================================================================
// PORTFOLIO RETURNS
// ============================================================================

/**
 * Historical average returns and volatility for common asset classes
 * Based on long-term historical data (educational reference)
 */
export const ASSET_CLASS_ASSUMPTIONS = {
  'US_LARGE_CAP': { mean: 0.10, stdDev: 0.16 },
  'US_SMALL_CAP': { mean: 0.12, stdDev: 0.20 },
  'INTERNATIONAL': { mean: 0.08, stdDev: 0.17 },
  'BONDS': { mean: 0.05, stdDev: 0.05 },
  'CASH': { mean: 0.02, stdDev: 0.01 },
  'REIT': { mean: 0.09, stdDev: 0.18 },
  'DEFAULT': { mean: 0.07, stdDev: 0.15 }, // Balanced portfolio
} as const

/**
 * Calculate expected annual return for a portfolio
 */
export function calculateExpectedReturn(
  portfolioValue: number,
  assetAllocation?: Record<string, number>,
  customMean?: number,
  customStdDev?: number
): { mean: number; stdDev: number } {
  if (customMean !== undefined && customStdDev !== undefined) {
    return { mean: customMean, stdDev: customStdDev }
  }
  
  if (!assetAllocation || Object.keys(assetAllocation).length === 0) {
    return ASSET_CLASS_ASSUMPTIONS.DEFAULT
  }
  
  let weightedMean = 0
  let weightedVar = 0
  
  for (const [assetClass, weight] of Object.entries(assetAllocation)) {
    const assumptions = ASSET_CLASS_ASSUMPTIONS[assetClass as keyof typeof ASSET_CLASS_ASSUMPTIONS]
      || ASSET_CLASS_ASSUMPTIONS.DEFAULT
    
    weightedMean += assumptions.mean * weight
    weightedVar += Math.pow(assumptions.stdDev, 2) * Math.pow(weight, 2)
  }
  
  return {
    mean: weightedMean,
    stdDev: Math.sqrt(weightedVar),
  }
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

/**
 * Run a single Monte Carlo path
 */
export function runSingleSimulation(
  initialValue: number,
  monthlyContribution: number,
  horizonMonths: number,
  annualMean: number,
  annualStdDev: number
): number {
  let value = initialValue
  
  // Convert annual to monthly parameters
  const monthlyMean = annualMean / 12
  const monthlyStdDev = annualStdDev / Math.sqrt(12)
  
  for (let month = 0; month < horizonMonths; month++) {
    // Apply contribution at start of month
    value += monthlyContribution
    
    // Apply random return
    const monthlyReturn = randomNormalWithParams(monthlyMean, monthlyStdDev)
    value *= (1 + monthlyReturn)
    
    // Floor at 0 (can't have negative portfolio value in this model)
    value = Math.max(0, value)
  }
  
  return value
}

/**
 * Run full Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  initialValue: number,
  monthlyContribution: number,
  horizonMonths: number,
  options: {
    annualMean?: number
    annualStdDev?: number
    assetAllocation?: Record<string, number>
    numSimulations?: number
    goalAmount?: number
  } = {}
): SimulationResult {
  const {
    annualMean,
    annualStdDev,
    assetAllocation,
    numSimulations = MONTE_CARLO_SIMULATIONS,
    goalAmount,
  } = options
  
  // Get return parameters
  const { mean: expMean, stdDev: expStdDev } = calculateExpectedReturn(
    initialValue,
    assetAllocation,
    annualMean,
    annualStdDev
  )
  
  // Run simulations
  const results: number[] = []
  
  for (let i = 0; i < numSimulations; i++) {
    const finalValue = runSingleSimulation(
      initialValue,
      monthlyContribution,
      horizonMonths,
      expMean,
      expStdDev
    )
    results.push(finalValue)
  }
  
  // Sort results for percentile calculations
  results.sort((a, b) => a - b)
  
  // Calculate statistics
  const sum = results.reduce((a, b) => a + b, 0)
  const mean = sum / results.length
  const variance = results.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / results.length
  const stdDev = Math.sqrt(variance)
  
  // Calculate percentiles
  const percentiles = {
    p10: percentile(results, 10),
    p25: percentile(results, 25),
    p50: percentile(results, 50),
    p75: percentile(results, 75),
    p90: percentile(results, 90),
  }
  
  // Calculate probability of reaching goal
  let probabilityOfGoal: number | null = null
  if (goalAmount !== undefined) {
    const successCount = results.filter(r => r >= goalAmount).length
    probabilityOfGoal = Math.round((successCount / results.length) * 100)
  }
  
  // Build assumptions string
  const assumptions = `Expected annual return: ${(expMean * 100).toFixed(1)}%, ` +
    `Volatility (std dev): ${(expStdDev * 100).toFixed(1)}%, ` +
    `Monthly contribution: $${monthlyContribution.toFixed(0)}, ` +
    `Simulations: ${numSimulations}`
  
  return {
    mean: Math.round(mean),
    stdDev: Math.round(stdDev),
    percentiles: {
      p10: Math.round(percentiles.p10),
      p25: Math.round(percentiles.p25),
      p50: Math.round(percentiles.p50),
      p75: Math.round(percentiles.p75),
      p90: Math.round(percentiles.p90),
    },
    confidenceInterval: [Math.round(percentiles.p10), Math.round(percentiles.p90)],
    probabilityOfGoal,
    simulationsRun: numSimulations,
    horizonMonths,
    assumptions,
  }
}

// ============================================================================
// SCENARIO COMPARISONS
// ============================================================================

export interface ScenarioComparison {
  name: string
  result: SimulationResult
}

/**
 * Compare different investment scenarios
 */
export function compareScenarios(
  initialValue: number,
  monthlyContribution: number,
  horizonMonths: number,
  goalAmount?: number
): {
  conservative: ScenarioComparison
  moderate: ScenarioComparison
  aggressive: ScenarioComparison
} {
  const conservativeOpts: Parameters<typeof runMonteCarloSimulation>[3] = {
    annualMean: 0.06,
    annualStdDev: 0.08,
  }
  if (goalAmount !== undefined) conservativeOpts.goalAmount = goalAmount

  const moderateOpts: Parameters<typeof runMonteCarloSimulation>[3] = {
    annualMean: 0.08,
    annualStdDev: 0.12,
  }
  if (goalAmount !== undefined) moderateOpts.goalAmount = goalAmount

  const aggressiveOpts: Parameters<typeof runMonteCarloSimulation>[3] = {
    annualMean: 0.10,
    annualStdDev: 0.16,
  }
  if (goalAmount !== undefined) aggressiveOpts.goalAmount = goalAmount

  return {
    conservative: {
      name: 'Conservative (60% Bonds, 40% Stocks)',
      result: runMonteCarloSimulation(initialValue, monthlyContribution, horizonMonths, conservativeOpts),
    },
    moderate: {
      name: 'Moderate (40% Bonds, 60% Stocks)',
      result: runMonteCarloSimulation(initialValue, monthlyContribution, horizonMonths, moderateOpts),
    },
    aggressive: {
      name: 'Aggressive (20% Bonds, 80% Stocks)',
      result: runMonteCarloSimulation(initialValue, monthlyContribution, horizonMonths, aggressiveOpts),
    },
  }
}

// ============================================================================
// RETIREMENT PROJECTION
// ============================================================================

export interface RetirementProjection {
  ageAtRetirement: number
  yearsUntilRetirement: number
  projectedBalance: SimulationResult
  monthlyIncomeFromPortfolio: number // Using 4% rule
  savingsNeededFor: {
    modestRetirement: number
    comfortableRetirement: number
    luxuryRetirement: number
  }
}

/**
 * Project retirement outcomes
 */
export function projectRetirement(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  options: {
    annualMean?: number
    annualStdDev?: number
  } = {}
): RetirementProjection {
  const yearsUntilRetirement = Math.max(0, retirementAge - currentAge)
  const monthsUntilRetirement = yearsUntilRetirement * 12
  
  const projection = runMonteCarloSimulation(
    currentSavings,
    monthlyContribution,
    monthsUntilRetirement,
    {
      annualMean: options.annualMean ?? 0.07,
      annualStdDev: options.annualStdDev ?? 0.15,
    }
  )
  
  // 4% withdrawal rule for sustainable retirement income
  const monthlyIncome = Math.round((projection.percentiles.p50 * 0.04) / 12)
  
  return {
    ageAtRetirement: retirementAge,
    yearsUntilRetirement,
    projectedBalance: projection,
    monthlyIncomeFromPortfolio: monthlyIncome,
    savingsNeededFor: {
      modestRetirement: 500000, // ~$1,667/mo at 4%
      comfortableRetirement: 1000000, // ~$3,333/mo at 4%
      luxuryRetirement: 2500000, // ~$8,333/mo at 4%
    },
  }
}

// ============================================================================
// CONTRIBUTION ANALYSIS
// ============================================================================

/**
 * Calculate required contribution to reach a goal
 */
export function calculateRequiredContribution(
  currentValue: number,
  goalAmount: number,
  horizonMonths: number,
  annualMean = 0.07
): {
  requiredMonthlyContribution: number
  assumptions: string
} {
  // Use simplified formula for required contribution
  // This is approximate; Monte Carlo can verify
  const monthlyRate = annualMean / 12
  
  // FV = PV(1+r)^n + PMT × [(1+r)^n - 1] / r
  // Solve for PMT
  const compoundFactor = Math.pow(1 + monthlyRate, horizonMonths)
  const futureValueOfPrincipal = currentValue * compoundFactor
  const remainingNeeded = goalAmount - futureValueOfPrincipal
  
  const annuityFactor = (compoundFactor - 1) / monthlyRate
  const requiredContribution = remainingNeeded / annuityFactor
  
  return {
    requiredMonthlyContribution: Math.max(0, Math.ceil(requiredContribution)),
    assumptions: `Assumes ${(annualMean * 100).toFixed(1)}% annual return, ${horizonMonths} month horizon`,
  }
}
