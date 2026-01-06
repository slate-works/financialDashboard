/**
 * Debt-to-Income & Debt Management Engine (Feature #8)
 * 
 * Guide debt payoff with avalanche vs snowball comparison.
 * Tracks DTI ratio for lending standards and financial health.
 * 
 * Source: CFP debt management, Consumer Financial Protection Bureau
 */

import type {
  DebtInput,
  DebtAnalysisResult,
  PayoffScheduleResult,
  PayoffStrategy,
  DTIStatus,
} from './types.js'
import {
  DTI_HEALTHY,
  DTI_ACCEPTABLE,
  DTI_HIGH_RISK,
} from './constants.js'
import { addMonths } from './utils.js'

// ============================================================================
// DTI CALCULATIONS
// ============================================================================

/**
 * Calculate Debt-to-Income ratio
 * Formula: (Total Monthly Debt Payments) / (Gross Monthly Income) × 100
 */
export function calculateDTI(totalMonthlyDebtPayments: number, grossMonthlyIncome: number): number {
  if (grossMonthlyIncome <= 0) return 0
  return (totalMonthlyDebtPayments / grossMonthlyIncome) * 100
}

/**
 * Classify DTI status
 */
export function classifyDTIStatus(dti: number): DTIStatus {
  if (dti <= DTI_HEALTHY * 100) return 'Healthy'
  if (dti <= DTI_ACCEPTABLE * 100) return 'Acceptable'
  return 'High Risk'
}

/**
 * Get DTI recommendation
 */
export function getDTIRecommendation(dti: number, status: DTIStatus): string {
  switch (status) {
    case 'Healthy':
      return `DTI of ${dti.toFixed(1)}% is healthy. Maintain current debt levels and consider accelerating payoff.`
    case 'Acceptable':
      return `DTI of ${dti.toFixed(1)}% is within lending limits but elevated. Avoid new debt and focus on payoff.`
    case 'High Risk':
      return `DTI of ${dti.toFixed(1)}% exceeds recommended limits. Prioritize aggressive debt reduction before taking on new obligations.`
  }
}

// ============================================================================
// PAYOFF SCHEDULE CALCULATION
// ============================================================================

interface PaymentPeriod {
  month: number
  payment: number
  principal: number
  interest: number
  remainingBalance: number
}

/**
 * Calculate monthly interest
 */
function calculateMonthlyInterest(balance: number, annualRate: number): number {
  const monthlyRate = annualRate / 100 / 12
  return balance * monthlyRate
}

/**
 * Generate payoff schedule for a single debt
 */
export function calculatePayoffSchedule(
  debt: DebtInput,
  monthlyPayment: number,
  maxMonths = 360 // 30 years max
): PayoffScheduleResult {
  const payments: PaymentPeriod[] = []
  let balance = debt.currentBalance
  let totalInterest = 0
  let month = 0
  
  while (balance > 0.01 && month < maxMonths) {
    month++
    
    // Calculate interest for this month
    const interest = calculateMonthlyInterest(balance, debt.annualInterestRate)
    totalInterest += interest
    
    // Calculate principal payment
    const payment = Math.min(monthlyPayment, balance + interest)
    const principal = payment - interest
    
    // Update balance
    balance = Math.max(0, balance - principal)
    
    payments.push({
      month,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingBalance: Math.round(balance * 100) / 100,
    })
  }
  
  return {
    debtId: debt.id,
    name: debt.name,
    strategy: 'avalanche', // Default, will be updated by caller
    monthsToPayoff: month,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    payoffDate: addMonths(new Date(), month),
    monthlyPayments: payments,
  }
}

// ============================================================================
// DEBT PAYOFF STRATEGIES
// ============================================================================

/**
 * Sort debts for avalanche method (highest interest first)
 */
export function sortForAvalanche(debts: DebtInput[]): DebtInput[] {
  return [...debts].sort((a, b) => b.annualInterestRate - a.annualInterestRate)
}

/**
 * Sort debts for snowball method (smallest balance first)
 */
export function sortForSnowball(debts: DebtInput[]): DebtInput[] {
  return [...debts].sort((a, b) => a.currentBalance - b.currentBalance)
}

/**
 * Simulate debt payoff with a strategy
 */
export function simulatePayoff(
  debts: DebtInput[],
  strategy: PayoffStrategy,
  extraMonthlyPayment = 0
): {
  totalMonths: number
  totalInterest: number
  payoffDate: Date
  schedules: PayoffScheduleResult[]
} {
  if (debts.length === 0) {
    return {
      totalMonths: 0,
      totalInterest: 0,
      payoffDate: new Date(),
      schedules: [],
    }
  }
  
  // Sort debts according to strategy
  const sortedDebts = strategy === 'avalanche' 
    ? sortForAvalanche(debts) 
    : sortForSnowball(debts)
  
  // Clone debts for simulation
  const debtStates = sortedDebts.map(d => ({
    ...d,
    balance: d.currentBalance,
  }))
  
  const schedules: PayoffScheduleResult[] = []
  let month = 0
  let totalInterest = 0
  const maxMonths = 360
  
  // Calculate total minimum payment
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minMonthlyPayment, 0)
  let availableExtra = extraMonthlyPayment
  
  // Track payments for each debt
  const debtPayments = new Map<number, PaymentPeriod[]>()
  for (const debt of sortedDebts) {
    debtPayments.set(debt.id, [])
  }
  
  while (debtStates.some(d => d.balance > 0.01) && month < maxMonths) {
    month++
    
    // Find current target debt (first with balance > 0 in sorted order)
    const targetDebtIndex = debtStates.findIndex(d => d.balance > 0.01)
    
    for (let i = 0; i < debtStates.length; i++) {
      const debt = debtStates[i]!
      if (debt.balance <= 0.01) continue
      
      // Calculate interest
      const interest = calculateMonthlyInterest(debt.balance, debt.annualInterestRate)
      totalInterest += interest
      
      // Calculate payment - target debt gets extra
      let payment = debt.minMonthlyPayment
      if (i === targetDebtIndex) {
        payment += availableExtra
      }
      payment = Math.min(payment, debt.balance + interest)
      
      const principal = payment - interest
      debt.balance = Math.max(0, debt.balance - principal)
      
      debtPayments.get(debt.id)!.push({
        month,
        payment: Math.round(payment * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        remainingBalance: Math.round(debt.balance * 100) / 100,
      })
      
      // If debt paid off, add its min payment to available extra
      if (debt.balance <= 0.01) {
        availableExtra += debt.minMonthlyPayment
      }
    }
  }
  
  // Build schedules
  for (const debt of sortedDebts) {
    const payments = debtPayments.get(debt.id)!
    const monthsToPayoff = payments.length
    const interestPaid = payments.reduce((sum, p) => sum + p.interest, 0)
    
    schedules.push({
      debtId: debt.id,
      name: debt.name,
      strategy,
      monthsToPayoff,
      totalInterestPaid: Math.round(interestPaid * 100) / 100,
      payoffDate: addMonths(new Date(), monthsToPayoff),
      monthlyPayments: payments,
    })
  }
  
  return {
    totalMonths: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    payoffDate: addMonths(new Date(), month),
    schedules,
  }
}

// ============================================================================
// STRATEGY COMPARISON
// ============================================================================

/**
 * Compare avalanche vs snowball strategies
 */
export function comparePayoffStrategies(
  debts: DebtInput[],
  extraMonthlyPayment = 0
): {
  avalanche: { totalInterest: number; totalMonths: number; payoffDate: Date }
  snowball: { totalInterest: number; totalMonths: number; payoffDate: Date }
  interestSaved: number
  recommendedStrategy: PayoffStrategy
  explanation: string
} {
  const avalanche = simulatePayoff(debts, 'avalanche', extraMonthlyPayment)
  const snowball = simulatePayoff(debts, 'snowball', extraMonthlyPayment)
  
  const interestSaved = snowball.totalInterest - avalanche.totalInterest
  
  let recommendedStrategy: PayoffStrategy
  let explanation: string
  
  if (interestSaved > 100) {
    recommendedStrategy = 'avalanche'
    explanation = `Avalanche saves $${interestSaved.toFixed(0)} in interest. Recommended for maximum savings.`
  } else if (interestSaved > 0) {
    recommendedStrategy = 'avalanche'
    explanation = `Avalanche saves $${interestSaved.toFixed(0)} in interest, but snowball may provide motivational wins from faster payoffs.`
  } else {
    recommendedStrategy = 'snowball'
    explanation = 'Methods are similar. Snowball recommended for motivational benefits of quick wins.'
  }
  
  return {
    avalanche: {
      totalInterest: avalanche.totalInterest,
      totalMonths: avalanche.totalMonths,
      payoffDate: avalanche.payoffDate,
    },
    snowball: {
      totalInterest: snowball.totalInterest,
      totalMonths: snowball.totalMonths,
      payoffDate: snowball.payoffDate,
    },
    interestSaved,
    recommendedStrategy,
    explanation,
  }
}

// ============================================================================
// MAIN DEBT ANALYSIS
// ============================================================================

export interface DebtAnalysisOptions {
  grossMonthlyIncome: number
  extraMonthlyPayment?: number
}

/**
 * Complete debt analysis
 */
export function analyzeDebt(
  debts: DebtInput[],
  options: DebtAnalysisOptions
): DebtAnalysisResult {
  const { grossMonthlyIncome, extraMonthlyPayment = 0 } = options
  
  if (debts.length === 0) {
    return {
      totalDebt: 0,
      totalMinPayment: 0,
      debtToIncome: 0,
      dtiStatus: 'Healthy',
      payoffComparison: {
        avalanche: { totalInterest: 0, totalMonths: 0, payoffDate: new Date() },
        snowball: { totalInterest: 0, totalMonths: 0, payoffDate: new Date() },
        interestSaved: 0,
      },
      recommendation: 'No debts tracked. Great job being debt-free!',
    }
  }
  
  // Calculate totals
  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0)
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minMonthlyPayment, 0)
  
  // Calculate DTI
  const dti = calculateDTI(totalMinPayment, grossMonthlyIncome)
  const dtiStatus = classifyDTIStatus(dti)
  
  // Compare strategies
  const comparison = comparePayoffStrategies(debts, extraMonthlyPayment)
  
  // Generate recommendation
  let recommendation = getDTIRecommendation(dti, dtiStatus)
  recommendation += ' ' + comparison.explanation
  
  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalMinPayment: Math.round(totalMinPayment * 100) / 100,
    debtToIncome: Math.round(dti * 10) / 10,
    dtiStatus,
    payoffComparison: {
      avalanche: comparison.avalanche,
      snowball: comparison.snowball,
      interestSaved: comparison.interestSaved,
    },
    recommendation,
  }
}

// ============================================================================
// REFINANCE ANALYSIS
// ============================================================================

/**
 * Calculate if refinancing makes sense
 */
export function analyzeRefinanceOpportunity(
  debt: DebtInput,
  newRate: number,
  refinanceCost: number
): {
  currentTotalCost: number
  newTotalCost: number
  savings: number
  breakEvenMonths: number
  recommendation: string
} {
  // Calculate current payoff
  const currentSchedule = calculatePayoffSchedule(debt, debt.minMonthlyPayment)
  const currentTotalCost = debt.currentBalance + currentSchedule.totalInterestPaid
  
  // Calculate new payoff
  const refinancedDebt: DebtInput = {
    ...debt,
    annualInterestRate: newRate,
    currentBalance: debt.currentBalance + refinanceCost,
  }
  const newSchedule = calculatePayoffSchedule(refinancedDebt, debt.minMonthlyPayment)
  const newTotalCost = refinancedDebt.currentBalance + newSchedule.totalInterestPaid
  
  const savings = currentTotalCost - newTotalCost
  
  // Calculate break-even
  const monthlyInterestSavings = (debt.annualInterestRate - newRate) / 100 / 12 * debt.currentBalance
  const breakEvenMonths = monthlyInterestSavings > 0 
    ? Math.ceil(refinanceCost / monthlyInterestSavings)
    : 999
  
  let recommendation: string
  if (savings > refinanceCost * 2) {
    recommendation = `Refinancing recommended. Save $${savings.toFixed(0)} over the loan term. Break-even in ${breakEvenMonths} months.`
  } else if (savings > 0) {
    recommendation = `Refinancing may be worthwhile. Save $${savings.toFixed(0)} but consider if you'll keep the loan past ${breakEvenMonths} months.`
  } else {
    recommendation = 'Refinancing not recommended at this rate. Current terms are better.'
  }
  
  return {
    currentTotalCost: Math.round(currentTotalCost * 100) / 100,
    newTotalCost: Math.round(newTotalCost * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    breakEvenMonths,
    recommendation,
  }
}
