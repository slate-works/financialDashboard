/**
 * Budget API Routes
 * 
 * CRUD operations for category budgets and variance reporting.
 */

import { Router } from 'express'
import { prisma } from '../db/index.js'
import {
  generateMonthlyBudgetReport,
  getYTDTracking,
  suggestInitialBudget,
} from '../engine/budgetVariance.js'
import { getMonthKey } from '../engine/utils.js'

const router = Router()

// ============================================================================
// GET /api/budgets - List all budgets
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { category: 'asc' },
    })
    
    res.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    res.status(500).json({ error: 'Failed to fetch budgets' })
  }
})

// ============================================================================
// POST /api/budgets - Create or update a budget
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { category, amount, period = 'monthly', notes } = req.body
    
    if (!category || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Category and amount are required' })
    }
    
    // Find existing budget for this category/period
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const existingBudget = await prisma.budget.findFirst({
      where: {
        category,
        period,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })
    
    let budget
    if (existingBudget) {
      // Update existing
      budget = await prisma.budget.update({
        where: { id: existingBudget.id },
        data: { amount, notes },
      })
    } else {
      // Create new
      budget = await prisma.budget.create({
        data: {
          category,
          amount,
          period,
          notes,
          startDate: startOfMonth,
        },
      })
    }
    
    res.json(budget)
  } catch (error) {
    console.error('Error saving budget:', error)
    res.status(500).json({ error: 'Failed to save budget' })
  }
})

// ============================================================================
// DELETE /api/budgets/:id - Delete a budget
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    
    await prisma.budget.delete({ where: { id } })
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    res.status(500).json({ error: 'Failed to delete budget' })
  }
})

// ============================================================================
// GET /api/budgets/variance - Get current month variance report
// ============================================================================

router.get('/variance', async (req, res) => {
  try {
    const { month } = req.query
    const targetMonth = month as string || getMonthKey(new Date())
    
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
    
    // Get transactions for the month
    const [year, monthNum] = targetMonth.split('-').map(Number)
    const startDate = new Date(year!, monthNum! - 1, 1)
    const endDate = new Date(year!, monthNum!, 0, 23, 59, 59)
    
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
    
    // Calculate income for surplus calculation
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const report = generateMonthlyBudgetReport(
      targetMonth,
      budgets.map(b => ({ category: b.category, amount: b.amount })),
      transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        amount: t.amount,
        type: t.type as 'income' | 'expense' | 'transfer',
        account: t.account,
        note: t.note,
      })),
      income
    )
    
    res.json(report)
  } catch (error) {
    console.error('Error generating variance report:', error)
    res.status(500).json({ error: 'Failed to generate variance report' })
  }
})

// ============================================================================
// GET /api/budgets/ytd - Get year-to-date tracking
// ============================================================================

router.get('/ytd', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear()
    
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
    
    // Get all transactions for the year
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)
    
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })
    
    const ytd = getYTDTracking(
      budgets.map(b => ({
        category: b.category,
        amount: b.amount,
        period: b.period as 'monthly' | 'annual',
      })),
      transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        amount: t.amount,
        type: t.type as 'income' | 'expense' | 'transfer',
        account: t.account,
        note: t.note,
      })),
      year
    )
    
    res.json(ytd)
  } catch (error) {
    console.error('Error generating YTD report:', error)
    res.status(500).json({ error: 'Failed to generate YTD report' })
  }
})

// ============================================================================
// GET /api/budgets/suggestions - Get budget suggestions based on history
// ============================================================================

router.get('/suggestions', async (req, res) => {
  try {
    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      where: { type: 'expense' },
      orderBy: { date: 'desc' },
    })
    
    // Get unique categories
    const categories = [...new Set(transactions.map(t => t.category))]
    
    // Generate suggestions for each category
    const suggestions = categories.map(category => {
      const suggestion = suggestInitialBudget(
        transactions.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          category: t.category,
          amount: t.amount,
          type: t.type as 'income' | 'expense' | 'transfer',
          account: t.account,
          note: t.note,
        })),
        category
      )
      
      return {
        category,
        ...suggestion,
      }
    })
    
    res.json(suggestions)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    res.status(500).json({ error: 'Failed to generate budget suggestions' })
  }
})

// ============================================================================
// POST /api/budgets/bulk - Create multiple budgets at once
// ============================================================================

router.post('/bulk', async (req, res) => {
  try {
    const { budgets } = req.body
    
    if (!Array.isArray(budgets)) {
      return res.status(400).json({ error: 'Budgets array is required' })
    }
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    // Upsert each budget
    const results = await Promise.all(
      budgets.map(async ({ category, amount, period = 'monthly' }) => {
        const existing = await prisma.budget.findFirst({
          where: {
            category,
            period,
            startDate: { lte: new Date() },
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
        })
        
        if (existing) {
          return prisma.budget.update({
            where: { id: existing.id },
            data: { amount },
          })
        }
        
        return prisma.budget.create({
          data: {
            category,
            amount,
            period,
            startDate: startOfMonth,
          },
        })
      })
    )
    
    res.json(results)
  } catch (error) {
    console.error('Error bulk creating budgets:', error)
    res.status(500).json({ error: 'Failed to create budgets' })
  }
})

export default router
