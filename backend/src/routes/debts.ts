/**
 * Debts API Routes
 * 
 * CRUD operations for debts and payoff analysis.
 */

import { Router } from 'express'
import { prisma } from '../db/index.js'
import {
  analyzeDebt,
  calculatePayoffSchedule,
  comparePayoffStrategies,
  analyzeRefinanceOpportunity,
} from '../engine/debtAnalyzer.js'
import type { DebtInput } from '../engine/types.js'

const router = Router()

// ============================================================================
// GET /api/debts - List all debts
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const debts = await prisma.debt.findMany({
      orderBy: [
        { status: 'asc' },
        { annualInterestRate: 'desc' },
      ],
    })
    
    res.json(debts)
  } catch (error) {
    console.error('Error fetching debts:', error)
    res.status(500).json({ error: 'Failed to fetch debts' })
  }
})

// ============================================================================
// POST /api/debts - Create a new debt
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      name,
      principalAmount,
      currentBalance,
      annualInterestRate,
      minMonthlyPayment,
      dueDayOfMonth,
      paymentMethod,
    } = req.body
    
    if (!name || typeof currentBalance !== 'number' || typeof annualInterestRate !== 'number') {
      return res.status(400).json({ error: 'Name, currentBalance, and annualInterestRate are required' })
    }
    
    const debt = await prisma.debt.create({
      data: {
        name,
        principalAmount: principalAmount || currentBalance,
        currentBalance,
        annualInterestRate,
        minMonthlyPayment: minMonthlyPayment || 0,
        dueDayOfMonth: dueDayOfMonth || 1,
        paymentMethod,
        status: 'active',
      },
    })
    
    res.json(debt)
  } catch (error) {
    console.error('Error creating debt:', error)
    res.status(500).json({ error: 'Failed to create debt' })
  }
})

// ============================================================================
// PUT /api/debts/:id - Update a debt
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const {
      name,
      principalAmount,
      currentBalance,
      annualInterestRate,
      minMonthlyPayment,
      dueDayOfMonth,
      paymentMethod,
      status,
    } = req.body
    
    const debt = await prisma.debt.update({
      where: { id },
      data: {
        name,
        principalAmount,
        currentBalance,
        annualInterestRate,
        minMonthlyPayment,
        dueDayOfMonth,
        paymentMethod,
        status,
      },
    })
    
    res.json(debt)
  } catch (error) {
    console.error('Error updating debt:', error)
    res.status(500).json({ error: 'Failed to update debt' })
  }
})

// ============================================================================
// DELETE /api/debts/:id - Delete a debt
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    
    await prisma.debt.delete({ where: { id } })
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting debt:', error)
    res.status(500).json({ error: 'Failed to delete debt' })
  }
})

// ============================================================================
// POST /api/debts/:id/payment - Record a payment on a debt
// ============================================================================

router.post('/:id/payment', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { amount } = req.body
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount required' })
    }
    
    const debt = await prisma.debt.findUnique({ where: { id } })
    if (!debt) {
      return res.status(404).json({ error: 'Debt not found' })
    }
    
    const newBalance = Math.max(0, debt.currentBalance - amount)
    const isPaidOff = newBalance === 0
    
    const updated = await prisma.debt.update({
      where: { id },
      data: {
        currentBalance: newBalance,
        status: isPaidOff ? 'paid_off' : 'active',
      },
    })
    
    res.json(updated)
  } catch (error) {
    console.error('Error recording payment:', error)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

// ============================================================================
// GET /api/debts/analysis - Get debt analysis with DTI and payoff comparison
// ============================================================================

router.get('/analysis', async (req, res) => {
  try {
    const grossMonthlyIncome = parseFloat(req.query.income as string) || 5000
    const extraMonthlyPayment = parseFloat(req.query.extra as string) || 0
    
    // Get active debts
    const debtsData = await prisma.debt.findMany({
      where: { status: 'active' },
    })
    
    if (debtsData.length === 0) {
      return res.json({
        totalDebt: 0,
        totalMinPayment: 0,
        debtToIncome: 0,
        dtiStatus: 'Healthy',
        payoffComparison: null,
        recommendation: 'No debts tracked. Great job being debt-free!',
      })
    }
    
    // Convert to engine format
    const debts: DebtInput[] = debtsData.map(d => ({
      id: d.id,
      name: d.name,
      principalAmount: d.principalAmount,
      currentBalance: d.currentBalance,
      annualInterestRate: d.annualInterestRate,
      minMonthlyPayment: d.minMonthlyPayment,
    }))
    
    const analysis = analyzeDebt(debts, { grossMonthlyIncome, extraMonthlyPayment })
    
    res.json(analysis)
  } catch (error) {
    console.error('Error analyzing debts:', error)
    res.status(500).json({ error: 'Failed to analyze debts' })
  }
})

// ============================================================================
// GET /api/debts/:id/schedule - Get payoff schedule for a specific debt
// ============================================================================

router.get('/:id/schedule', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const monthlyPayment = parseFloat(req.query.payment as string)
    
    const debt = await prisma.debt.findUnique({ where: { id } })
    if (!debt) {
      return res.status(404).json({ error: 'Debt not found' })
    }
    
    const debtInput: DebtInput = {
      id: debt.id,
      name: debt.name,
      principalAmount: debt.principalAmount,
      currentBalance: debt.currentBalance,
      annualInterestRate: debt.annualInterestRate,
      minMonthlyPayment: debt.minMonthlyPayment,
    }
    
    const payment = monthlyPayment || debt.minMonthlyPayment
    const schedule = calculatePayoffSchedule(debtInput, payment)
    
    res.json(schedule)
  } catch (error) {
    console.error('Error calculating schedule:', error)
    res.status(500).json({ error: 'Failed to calculate schedule' })
  }
})

// ============================================================================
// GET /api/debts/comparison - Compare payoff strategies
// ============================================================================

router.get('/comparison', async (req, res) => {
  try {
    const extraMonthlyPayment = parseFloat(req.query.extra as string) || 0
    
    const debtsData = await prisma.debt.findMany({
      where: { status: 'active' },
    })
    
    if (debtsData.length === 0) {
      return res.json({ message: 'No active debts to compare' })
    }
    
    const debts: DebtInput[] = debtsData.map(d => ({
      id: d.id,
      name: d.name,
      principalAmount: d.principalAmount,
      currentBalance: d.currentBalance,
      annualInterestRate: d.annualInterestRate,
      minMonthlyPayment: d.minMonthlyPayment,
    }))
    
    const comparison = comparePayoffStrategies(debts, extraMonthlyPayment)
    
    res.json(comparison)
  } catch (error) {
    console.error('Error comparing strategies:', error)
    res.status(500).json({ error: 'Failed to compare strategies' })
  }
})

// ============================================================================
// POST /api/debts/:id/refinance-analysis - Analyze refinancing opportunity
// ============================================================================

router.post('/:id/refinance-analysis', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { newRate, refinanceCost } = req.body
    
    if (typeof newRate !== 'number' || typeof refinanceCost !== 'number') {
      return res.status(400).json({ error: 'newRate and refinanceCost are required' })
    }
    
    const debt = await prisma.debt.findUnique({ where: { id } })
    if (!debt) {
      return res.status(404).json({ error: 'Debt not found' })
    }
    
    const debtInput: DebtInput = {
      id: debt.id,
      name: debt.name,
      principalAmount: debt.principalAmount,
      currentBalance: debt.currentBalance,
      annualInterestRate: debt.annualInterestRate,
      minMonthlyPayment: debt.minMonthlyPayment,
    }
    
    const analysis = analyzeRefinanceOpportunity(debtInput, newRate, refinanceCost)
    
    res.json(analysis)
  } catch (error) {
    console.error('Error analyzing refinance:', error)
    res.status(500).json({ error: 'Failed to analyze refinance' })
  }
})

export default router
