/**
 * Emergency Fund Calculator Engine (Feature #12)
 * 
 * Calculate personal emergency fund target based on risk profile.
 * Uses CFP-guided factors including income stability, dependents, and health.
 * 
 * Source: CFP emergency fund guidance, Dave Ramsey methodology
 */

import type {
  EmergencyFundInput,
  EmergencyFundResult,
  EmergencyFundStatus,
  IncomeStabilityLevel,
  HealthRiskLevel,
} from './types.js'
import {
  EF_BASE_STABLE,
  EF_BASE_VARIABLE,
  EF_BASE_HIGH_VARIABLE,
  EF_DEPENDENT_ADJUSTMENT,
  EF_HEALTH_ADJUSTMENT,
  EF_MAX_MONTHS,
  EF_MIN_MONTHS,
} from './constants.js'
import { clamp } from './utils.js'

// ============================================================================
// INCOME STABILITY ASSESSMENT
// ============================================================================

/**
 * Get base months recommendation based on income stability
 */
export function getBaseMonthsForStability(
  stability: IncomeStabilityLevel
): { min: number; max: number } {
  switch (stability) {
    case 'stable':
      return EF_BASE_STABLE
    case 'variable':
      return EF_BASE_VARIABLE
    case 'high_variable':
      return EF_BASE_HIGH_VARIABLE
    default:
      return EF_BASE_STABLE
  }
}

/**
 * Assess income stability from transactions or user input
 */
export function assessIncomeStability(
  incomeCoefficientOfVariation: number | null
): IncomeStabilityLevel {
  if (incomeCoefficientOfVariation === null) return 'variable' // Conservative default
  
  if (incomeCoefficientOfVariation < 0.1) return 'stable'
  if (incomeCoefficientOfVariation < 0.3) return 'variable'
  return 'high_variable'
}

// ============================================================================
// ADJUSTMENT FACTORS
// ============================================================================

/**
 * Calculate additional months for dependents
 */
export function getDependentAdjustment(dependents: number): number {
  return dependents * EF_DEPENDENT_ADJUSTMENT
}

/**
 * Calculate additional months for health risk
 */
export function getHealthAdjustment(healthRisk: HealthRiskLevel): number {
  switch (healthRisk) {
    case 'elevated':
      return 1
    case 'high':
      return EF_HEALTH_ADJUSTMENT
    default:
      return 0
  }
}

/**
 * Calculate job stability adjustment
 * More years at job = more stability = potentially fewer months needed
 */
export function getJobStabilityAdjustment(yearsAtJob: number): number {
  if (yearsAtJob >= 10) return -1 // Very stable, can reduce by 1 month
  if (yearsAtJob >= 5) return 0  // Stable, no change
  if (yearsAtJob >= 2) return 1  // Moderate stability, add 1 month
  return 2 // Low stability, add 2 months
}

/**
 * Calculate partner income adjustment
 * Dual income households have more buffer
 */
export function getPartnerIncomeAdjustment(hasPartnerIncome: boolean): number {
  return hasPartnerIncome ? -1 : 0
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate recommended emergency fund months and amount
 */
export function calculateEmergencyFund(
  input: EmergencyFundInput
): EmergencyFundResult {
  // Get base recommendation
  const baseRange = getBaseMonthsForStability(input.incomeStability)
  
  // Calculate adjustments
  const dependentAdj = getDependentAdjustment(input.dependents)
  const healthAdj = getHealthAdjustment(input.healthRisk)
  const jobAdj = getJobStabilityAdjustment(input.jobStabilityYears)
  const partnerAdj = getPartnerIncomeAdjustment(input.hasPartnerIncome)
  
  // Sum adjustments
  const totalAdjustment = dependentAdj + healthAdj + jobAdj + partnerAdj
  
  // Calculate recommended months
  const adjustedMin = clamp(baseRange.min + totalAdjustment, EF_MIN_MONTHS, EF_MAX_MONTHS)
  const adjustedMax = clamp(baseRange.max + totalAdjustment, EF_MIN_MONTHS, EF_MAX_MONTHS)
  
  // Use midpoint as primary recommendation
  const recommendedMonths = Math.round((adjustedMin + adjustedMax) / 2)
  
  // Calculate dollar amounts
  const recommendedAmount = Math.round(input.monthlyEssentialExpenses * recommendedMonths)
  
  // Determine status
  let status: EmergencyFundStatus
  const fundRatio = input.currentBalance / recommendedAmount
  
  if (fundRatio >= 1) {
    status = 'above_target'
  } else if (fundRatio >= 0.8) {
    status = 'adequate'
  } else {
    status = 'below_target'
  }
  
  // Calculate action needed
  const actionNeeded = recommendedAmount - input.currentBalance
  
  // Calculate months to target (assuming saving toward it)
  // This would typically use actual savings rate, but we'll show as info
  const monthsToTarget = actionNeeded > 0 
    ? null // Would need monthly savings input
    : 0
  
  // Build rationale
  const rationale: string[] = []
  
  rationale.push(`Base recommendation: ${baseRange.min}-${baseRange.max} months for ${input.incomeStability} income.`)
  
  if (dependentAdj > 0) {
    rationale.push(`+${dependentAdj} month(s) for ${input.dependents} dependent(s).`)
  }
  if (healthAdj > 0) {
    rationale.push(`+${healthAdj} month(s) for ${input.healthRisk} health risk.`)
  }
  if (jobAdj !== 0) {
    const jobDesc = jobAdj < 0 ? 'long tenure' : jobAdj === 1 ? 'moderate job tenure' : 'short job tenure'
    rationale.push(`${jobAdj > 0 ? '+' : ''}${jobAdj} month(s) for ${jobDesc} (${input.jobStabilityYears} years).`)
  }
  if (partnerAdj < 0) {
    rationale.push(`${partnerAdj} month(s) for dual income household.`)
  }
  
  rationale.push(`Final recommendation: ${recommendedMonths} months = $${recommendedAmount.toLocaleString()}.`)
  
  return {
    recommendedMonths,
    recommendedRange: { min: adjustedMin, max: adjustedMax },
    recommendedAmount,
    currentBalance: input.currentBalance,
    status,
    actionNeeded,
    monthsToTarget,
    rationale,
  }
}

// ============================================================================
// STATUS EXPLANATIONS
// ============================================================================

/**
 * Get status explanation and recommendation
 */
export function getStatusExplanation(
  result: EmergencyFundResult
): { summary: string; nextStep: string } {
  const percentFunded = Math.round((result.currentBalance / result.recommendedAmount) * 100)
  
  switch (result.status) {
    case 'above_target':
      return {
        summary: `Emergency fund is ${percentFunded}% funded - above your target!`,
        nextStep: 'Consider investing excess funds or increasing retirement contributions.',
      }
    case 'adequate':
      return {
        summary: `Emergency fund is ${percentFunded}% funded - nearly at target.`,
        nextStep: `Build up $${Math.abs(result.actionNeeded).toLocaleString()} more to reach full target.`,
      }
    case 'below_target':
      return {
        summary: `Emergency fund is ${percentFunded}% funded - below recommended level.`,
        nextStep: `Prioritize building $${result.actionNeeded.toLocaleString()} in emergency savings before other goals.`,
      }
  }
}

// ============================================================================
// QUICK ASSESSMENT
// ============================================================================

/**
 * Quick emergency fund assessment based on minimal inputs
 */
export function quickAssessment(
  monthlyExpenses: number,
  currentSavings: number,
  hasVariableIncome: boolean
): {
  minimumTarget: number
  recommendedTarget: number
  status: 'critical' | 'underfunded' | 'adequate' | 'well-funded'
  monthsCovered: number
  advice: string
} {
  // Quick calculation: 3-6 months for stable, 6-9 for variable
  const minMonths = hasVariableIncome ? 6 : 3
  const maxMonths = hasVariableIncome ? 9 : 6
  
  const minimumTarget = monthlyExpenses * minMonths
  const recommendedTarget = monthlyExpenses * maxMonths
  const monthsCovered = currentSavings / monthlyExpenses
  
  let status: 'critical' | 'underfunded' | 'adequate' | 'well-funded'
  let advice: string
  
  if (monthsCovered < 1) {
    status = 'critical'
    advice = 'URGENT: Less than 1 month of expenses saved. Pause non-essential spending and build a starter fund immediately.'
  } else if (monthsCovered < minMonths) {
    status = 'underfunded'
    advice = `Build emergency fund to ${minMonths} months before investing or paying extra on low-interest debt.`
  } else if (monthsCovered < maxMonths) {
    status = 'adequate'
    advice = 'Good progress! Continue building toward full recommendation while pursuing other goals.'
  } else {
    status = 'well-funded'
    advice = 'Emergency fund is healthy. Focus on retirement, debt payoff, or other priorities.'
  }
  
  return {
    minimumTarget: Math.round(minimumTarget),
    recommendedTarget: Math.round(recommendedTarget),
    status,
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    advice,
  }
}

// ============================================================================
// ESSENTIAL EXPENSES ESTIMATION
// ============================================================================

/**
 * Estimate essential monthly expenses from transaction history
 * Essential = Rent/Mortgage + Utilities + Groceries + Insurance + Minimum debt payments
 */
export function estimateEssentialExpenses(
  categoryTotals: Map<string, number>,
  months: number
): { monthlyEssential: number; breakdown: Map<string, number> } {
  const essentialCategories = [
    'Rent',
    'Mortgage',
    'Utilities',
    'Groceries',
    'Insurance',
    'Healthcare',
    'Transportation',
    'Phone',
    'Internet',
    'Debt',
    'Loan',
    'Childcare',
  ]
  
  const breakdown = new Map<string, number>()
  let total = 0
  
  for (const [category, amount] of categoryTotals) {
    const isEssential = essentialCategories.some(
      e => category.toLowerCase().includes(e.toLowerCase())
    )
    
    if (isEssential) {
      const monthlyAmount = amount / months
      breakdown.set(category, Math.round(monthlyAmount))
      total += monthlyAmount
    }
  }
  
  return {
    monthlyEssential: Math.round(total),
    breakdown,
  }
}
