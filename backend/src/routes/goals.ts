/**
 * Goals API Routes
 * 
 * CRUD operations for financial goals and progress tracking.
 */

import { Router } from 'express'
import { prisma } from '../db/index.js'
import {
  analyzeSavings,
  analyzeGoalProgress,
  projectGoalScenarios,
  calculateRequiredMonthlyContribution,
} from '../engine/savingsGoals.js'
import type { GoalInput } from '../engine/savingsGoals.js'

const router = Router()

// ============================================================================
// GET /api/goals - List all goals
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { targetDate: 'asc' },
      ],
    })
    
    res.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    res.status(500).json({ error: 'Failed to fetch goals' })
  }
})

// ============================================================================
// POST /api/goals - Create a new goal
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { name, description, targetAmount, currentSaved, targetDate, priority, category } = req.body
    
    if (!name || typeof targetAmount !== 'number' || !targetDate) {
      return res.status(400).json({ error: 'Name, targetAmount, and targetDate are required' })
    }
    
    const goal = await prisma.goal.create({
      data: {
        name,
        description,
        targetAmount,
        currentSaved: currentSaved || 0,
        targetDate: new Date(targetDate),
        priority: priority || 1,
        category,
        status: 'active',
      },
    })
    
    res.json(goal)
  } catch (error) {
    console.error('Error creating goal:', error)
    res.status(500).json({ error: 'Failed to create goal' })
  }
})

// ============================================================================
// PUT /api/goals/:id - Update a goal
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { name, description, targetAmount, currentSaved, targetDate, priority, category, status } = req.body
    
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (targetAmount !== undefined) updateData.targetAmount = targetAmount
    if (currentSaved !== undefined) updateData.currentSaved = currentSaved
    if (targetDate !== undefined) updateData.targetDate = new Date(targetDate)
    if (priority !== undefined) updateData.priority = priority
    if (category !== undefined) updateData.category = category
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') updateData.completedAt = new Date()
    }
    
    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    })
    
    res.json(goal)
  } catch (error) {
    console.error('Error updating goal:', error)
    res.status(500).json({ error: 'Failed to update goal' })
  }
})

// ============================================================================
// DELETE /api/goals/:id - Delete a goal
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    
    await prisma.goal.delete({ where: { id } })
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    res.status(500).json({ error: 'Failed to delete goal' })
  }
})

// ============================================================================
// POST /api/goals/:id/contribute - Add contribution to a goal
// ============================================================================

router.post('/:id/contribute', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { amount } = req.body
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid contribution amount required' })
    }
    
    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' })
    }
    
    const newSaved = goal.currentSaved + amount
    const isComplete = newSaved >= goal.targetAmount
    
    const contributeData: Record<string, unknown> = {
      currentSaved: newSaved,
      status: isComplete ? 'completed' : 'active',
    }
    if (isComplete) contributeData.completedAt = new Date()
    
    const updated = await prisma.goal.update({
      where: { id },
      data: contributeData,
    })
    
    res.json(updated)
  } catch (error) {
    console.error('Error adding contribution:', error)
    res.status(500).json({ error: 'Failed to add contribution' })
  }
})

// ============================================================================
// GET /api/goals/analysis - Get savings analysis with goal progress
// ============================================================================

router.get('/analysis', async (req, res) => {
  try {
    const lookbackMonths = parseInt(req.query.months as string, 10) || 6
    
    // Get goals
    const goalsData = await prisma.goal.findMany({
      where: { status: 'active' },
      orderBy: { priority: 'asc' },
    })
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    })
    
    // Convert to engine format
    const goals: GoalInput[] = goalsData.map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentSaved: g.currentSaved,
      targetDate: g.targetDate,
      priority: g.priority,
    }))
    
    const txnInput = transactions.map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type as 'income' | 'expense' | 'transfer',
      account: t.account,
      note: t.note,
    }))
    
    const analysis = analyzeSavings(txnInput, { goals, lookbackMonths })
    
    res.json(analysis)
  } catch (error) {
    console.error('Error analyzing savings:', error)
    res.status(500).json({ error: 'Failed to analyze savings' })
  }
})

// ============================================================================
// GET /api/goals/:id/projection - Get goal projection scenarios
// ============================================================================

router.get('/:id/projection', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const monthlySavings = parseFloat(req.query.savings as string) || 500
    
    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' })
    }
    
    const goalInput: GoalInput = {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentSaved: goal.currentSaved,
      targetDate: goal.targetDate,
      priority: goal.priority,
    }
    
    const projection = projectGoalScenarios(goalInput, monthlySavings)
    
    res.json(projection)
  } catch (error) {
    console.error('Error projecting goal:', error)
    res.status(500).json({ error: 'Failed to project goal' })
  }
})

export default router
