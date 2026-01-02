/**
 * Analytics API Routes
 * 
 * Comprehensive financial analytics endpoints using the metrics engine.
 */

import { Router } from 'express'
import { prisma } from '../db/index.js'
import {
  forecastCategory,
  forecastTotalExpenses,
  detectRecurringPatterns,
  calculateRecurringTotal,
  analyzeCashFlowStability,
  analyzeRunway,
  detectAnomaliesInBatch,
  summarizeAnomalies,
  analyzeAdherence,
  generateAdaptiveBudget,
  runMonteCarloSimulation,
  compareScenarios,
  calculateEmergencyFund,
  quickAssessment,
  estimateEssentialExpenses,
  type TransactionInput,
} from '../engine/index.js'
import { aggregateByCategory } from '../engine/utils.js'

const router = Router()

// ============================================================================
// GET /api/analytics/forecast - Get expense forecasts
// ============================================================================

router.get('/forecast', async (req, res) => {
  try {
    const category = req.query.category as string | undefined
    const horizonMonths = parseInt(req.query.horizon as string, 10) || 1
    
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    if (category) {
      const forecast = forecastCategory(txnInput, category, { horizonMonths })
      return res.json(forecast)
    }
    
    const totalForecast = forecastTotalExpenses(txnInput, { horizonMonths })
    res.json(totalForecast)
  } catch (error) {
    console.error('Error generating forecast:', error)
    res.status(500).json({ error: 'Failed to generate forecast' })
  }
})

// ============================================================================
// GET /api/analytics/recurring - Get detected recurring patterns
// ============================================================================

router.get('/recurring', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const patterns = detectRecurringPatterns(txnInput)
    const totals = calculateRecurringTotal(patterns)
    
    res.json({
      patterns,
      totals,
      count: patterns.length,
      confirmedCount: patterns.filter(p => p.status === 'Confirmed').length,
    })
  } catch (error) {
    console.error('Error detecting recurring patterns:', error)
    res.status(500).json({ error: 'Failed to detect recurring patterns' })
  }
})

// ============================================================================
// GET /api/analytics/stability - Get cash flow stability analysis
// ============================================================================

router.get('/stability', async (req, res) => {
  try {
    const lookbackMonths = parseInt(req.query.months as string, 10) || 12
    
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const stability = analyzeCashFlowStability(txnInput, { lookbackMonths })
    
    res.json(stability)
  } catch (error) {
    console.error('Error analyzing stability:', error)
    res.status(500).json({ error: 'Failed to analyze stability' })
  }
})

// ============================================================================
// GET /api/analytics/runway - Get runway analysis
// ============================================================================

router.get('/runway', async (req, res) => {
  try {
    const cashOnHand = parseFloat(req.query.cash as string) || 10000
    const lookbackMonths = parseInt(req.query.months as string, 10) || 6
    
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const runway = analyzeRunway(txnInput, { cashOnHand, lookbackMonths })
    
    res.json(runway)
  } catch (error) {
    console.error('Error analyzing runway:', error)
    res.status(500).json({ error: 'Failed to analyze runway' })
  }
})

// ============================================================================
// GET /api/analytics/anomalies - Get anomaly detection results
// ============================================================================

router.get('/anomalies', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    // Get recent transactions to analyze
    const recentTransactions = await prisma.transaction.findMany({
      where: { date: { gte: cutoffDate } },
      orderBy: { date: 'desc' },
    })
    
    // Get all transactions for history
    const allTransactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const recentInput: TransactionInput[] = recentTransactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const allInput: TransactionInput[] = allTransactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const results = detectAnomaliesInBatch(recentInput, allInput)
    const summary = summarizeAnomalies(results)
    
    // Convert Map to array for JSON response
    const anomalies = Array.from(results.entries())
      .filter(([_, result]) => result.anomalyScore > 0)
      .map(([id, result]) => ({
        transactionId: id,
        transaction: recentTransactions.find(t => t.id === id),
        ...result,
      }))
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
    
    res.json({
      anomalies,
      summary,
    })
  } catch (error) {
    console.error('Error detecting anomalies:', error)
    res.status(500).json({ error: 'Failed to detect anomalies' })
  }
})

// ============================================================================
// GET /api/analytics/adherence - Get budget adherence analysis
// ============================================================================

router.get('/adherence', async (req, res) => {
  try {
    const lookbackMonths = parseInt(req.query.months as string, 10) || 6
    
    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: {
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const adherence = analyzeAdherence(txnInput, {
      budgets: budgets.map(b => ({ category: b.category, amount: b.amount })),
      lookbackMonths,
    })
    
    res.json(adherence)
  } catch (error) {
    console.error('Error analyzing adherence:', error)
    res.status(500).json({ error: 'Failed to analyze adherence' })
  }
})

// ============================================================================
// GET /api/analytics/recommendations - Get adaptive budget recommendations
// ============================================================================

router.get('/recommendations', async (req, res) => {
  try {
    const targetMonthlySavings = req.query.savings 
      ? parseFloat(req.query.savings as string) 
      : undefined
    
    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: {
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const adaptiveOpts: Parameters<typeof generateAdaptiveBudget>[1] = {
      budgets: budgets.map(b => ({ category: b.category, amount: b.amount })),
    }
    if (targetMonthlySavings !== undefined) {
      adaptiveOpts.targetMonthlySavings = targetMonthlySavings
    }
    
    const recommendations = generateAdaptiveBudget(txnInput, adaptiveOpts)
    
    res.json(recommendations)
  } catch (error) {
    console.error('Error generating recommendations:', error)
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

// ============================================================================
// POST /api/analytics/simulate - Run investment simulation
// ============================================================================

router.post('/simulate', async (req, res) => {
  try {
    const {
      initialValue = 10000,
      monthlyContribution = 500,
      horizonMonths = 120,
      goalAmount,
      annualMean,
      annualStdDev,
    } = req.body
    
    const result = runMonteCarloSimulation(initialValue, monthlyContribution, horizonMonths, {
      goalAmount,
      annualMean,
      annualStdDev,
    })
    
    res.json(result)
  } catch (error) {
    console.error('Error running simulation:', error)
    res.status(500).json({ error: 'Failed to run simulation' })
  }
})

// ============================================================================
// POST /api/analytics/simulate/compare - Compare investment scenarios
// ============================================================================

router.post('/simulate/compare', async (req, res) => {
  try {
    const {
      initialValue = 10000,
      monthlyContribution = 500,
      horizonMonths = 120,
      goalAmount,
    } = req.body
    
    const scenarios = compareScenarios(initialValue, monthlyContribution, horizonMonths, goalAmount)
    
    res.json(scenarios)
  } catch (error) {
    console.error('Error comparing scenarios:', error)
    res.status(500).json({ error: 'Failed to compare scenarios' })
  }
})

// ============================================================================
// POST /api/analytics/emergency-fund - Calculate emergency fund recommendation
// ============================================================================

router.post('/emergency-fund', async (req, res) => {
  try {
    const {
      incomeStability = 'variable',
      monthlyEssentialExpenses,
      dependents = 0,
      healthRisk = 'normal',
      jobStabilityYears = 2,
      hasPartnerIncome = false,
      currentBalance = 0,
    } = req.body
    
    // If no monthly expenses provided, estimate from transactions
    let expenses = monthlyEssentialExpenses
    if (!expenses) {
      const transactions = await prisma.transaction.findMany({
        where: { type: 'expense' },
        orderBy: { date: 'desc' },
      })
      
      const txnInput: TransactionInput[] = transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        amount: t.amount,
        type: t.type as 'income' | 'expense' | 'transfer',
        account: t.account,
        note: t.note,
      }))
      
      const categoryTotals = aggregateByCategory(txnInput, 'expense')
      const months = Math.max(1, new Set(transactions.map(t => 
        `${t.date.getFullYear()}-${t.date.getMonth()}`
      )).size)
      
      const { monthlyEssential } = estimateEssentialExpenses(categoryTotals, months)
      expenses = monthlyEssential || 3000 // Default fallback
    }
    
    const result = calculateEmergencyFund({
      incomeStability,
      monthlyEssentialExpenses: expenses,
      dependents,
      healthRisk,
      jobStabilityYears,
      hasPartnerIncome,
      currentBalance,
    })
    
    res.json(result)
  } catch (error) {
    console.error('Error calculating emergency fund:', error)
    res.status(500).json({ error: 'Failed to calculate emergency fund' })
  }
})

// ============================================================================
// GET /api/analytics/emergency-fund/quick - Quick emergency fund assessment
// ============================================================================

router.get('/emergency-fund/quick', async (req, res) => {
  try {
    const currentSavings = parseFloat(req.query.savings as string) || 0
    const hasVariableIncome = req.query.variable === 'true'
    
    // Estimate monthly expenses from transactions
    const transactions = await prisma.transaction.findMany({
      where: { type: 'expense' },
      orderBy: { date: 'desc' },
    })
    
    const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const months = Math.max(1, new Set(transactions.map(t => 
      `${t.date.getFullYear()}-${t.date.getMonth()}`
    )).size)
    const monthlyExpenses = totalExpenses / months
    
    const assessment = quickAssessment(monthlyExpenses, currentSavings, hasVariableIncome)
    
    res.json({
      ...assessment,
      estimatedMonthlyExpenses: Math.round(monthlyExpenses),
    })
  } catch (error) {
    console.error('Error assessing emergency fund:', error)
    res.status(500).json({ error: 'Failed to assess emergency fund' })
  }
})

// ============================================================================
// GET /api/analytics/summary - Get comprehensive analytics summary
// ============================================================================

router.get('/summary', async (req, res) => {
  try {
    const cashOnHand = parseFloat(req.query.cash as string) || 10000
    
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    const budgets = await prisma.budget.findMany({
      where: {
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })
    
    const txnInput: TransactionInput[] = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    // Calculate key metrics
    const stability = analyzeCashFlowStability(txnInput, { lookbackMonths: 6 })
    const runway = analyzeRunway(txnInput, { cashOnHand, lookbackMonths: 6 })
    const forecast = forecastTotalExpenses(txnInput)
    const recurring = detectRecurringPatterns(txnInput)
    const recurringTotals = calculateRecurringTotal(recurring)
    
    // Only calculate adherence if budgets exist
    let adherence = null
    if (budgets.length > 0) {
      adherence = analyzeAdherence(txnInput, {
        budgets: budgets.map(b => ({ category: b.category, amount: b.amount })),
        lookbackMonths: 3,
      })
    }
    
    res.json({
      stability: {
        index: stability.stabilityIndex,
        rating: stability.rating,
        explanation: stability.explanation,
      },
      runway: {
        months: runway.scenarios.base.runwayMonths,
        status: runway.scenarios.base.status,
        burnRate: runway.netBurnRate,
        recommendation: runway.recommendation,
      },
      forecast: {
        nextMonth: forecast.forecast,
        confidence: forecast.confidence,
        trend: forecast.trend,
      },
      recurring: {
        monthlyTotal: recurringTotals.monthly,
        annualTotal: recurringTotals.annual,
        confirmedCount: recurring.filter(p => p.status === 'Confirmed').length,
      },
      adherence: adherence ? {
        score: adherence.overallScore,
        rating: adherence.rating,
        trend: adherence.trend,
      } : null,
      dataQuality: {
        transactionCount: transactions.length,
        monthsOfData: new Set(transactions.map(t => 
          `${t.date.getFullYear()}-${t.date.getMonth()}`
        )).size,
        budgetCount: budgets.length,
      },
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
})

export default router
