/**
 * Budget Variance Engine Tests
 */

import { describe, it, expect } from 'vitest'
import {
  calculateBudgetVariance,
  classifyVarianceStatus,
  isRedFlag,
  calculateMonthSurplus,
  calculateCategoryVariance,
  generateCategoryVarianceReport,
  generateMonthlyBudgetReport,
  suggestInitialBudget,
} from './budgetVariance.js'
import { sampleTransactions, monthDate } from '../__tests__/fixtures/transactions.js'

describe('Budget Variance Engine', () => {
  describe('calculateBudgetVariance', () => {
    it('should return 0 when actual equals budget', () => {
      expect(calculateBudgetVariance(100, 100)).toBe(0)
    })

    it('should return positive variance when over budget', () => {
      // 120 actual vs 100 budget = 20% over
      expect(calculateBudgetVariance(100, 120)).toBe(20)
    })

    it('should return negative variance when under budget', () => {
      // 80 actual vs 100 budget = 20% under
      expect(calculateBudgetVariance(100, 80)).toBe(-20)
    })

    it('should return Infinity when no budget set but spending occurred', () => {
      expect(calculateBudgetVariance(0, 50)).toBe(Infinity)
    })

    it('should return 0 when both budget and actual are 0', () => {
      expect(calculateBudgetVariance(0, 0)).toBe(0)
    })
  })

  describe('classifyVarianceStatus', () => {
    it('should classify as "On Track" when within ±20%', () => {
      expect(classifyVarianceStatus(0)).toBe('On Track')
      expect(classifyVarianceStatus(15)).toBe('On Track')
      expect(classifyVarianceStatus(-15)).toBe('On Track')
      expect(classifyVarianceStatus(20)).toBe('On Track')
      expect(classifyVarianceStatus(-20)).toBe('On Track')
    })

    it('should classify as "Over Budget" when > 20%', () => {
      expect(classifyVarianceStatus(21)).toBe('Over Budget')
      expect(classifyVarianceStatus(50)).toBe('Over Budget')
      expect(classifyVarianceStatus(Infinity)).toBe('Over Budget')
    })

    it('should classify as "Under Budget" when < -20%', () => {
      expect(classifyVarianceStatus(-21)).toBe('Under Budget')
      expect(classifyVarianceStatus(-50)).toBe('Under Budget')
    })
  })

  describe('isRedFlag', () => {
    it('should flag when variance exceeds 20%', () => {
      expect(isRedFlag(21)).toBe(true)
      expect(isRedFlag(50)).toBe(true)
    })

    it('should not flag when variance is within threshold', () => {
      expect(isRedFlag(20)).toBe(false)
      expect(isRedFlag(0)).toBe(false)
      expect(isRedFlag(-50)).toBe(false) // Under budget is not a red flag
    })

    it('should flag Infinity (no budget set)', () => {
      expect(isRedFlag(Infinity)).toBe(true)
    })
  })

  describe('calculateMonthSurplus', () => {
    it('should return positive surplus when income > expenses', () => {
      expect(calculateMonthSurplus(5000, 3000)).toBe(2000)
    })

    it('should return negative deficit when expenses > income', () => {
      expect(calculateMonthSurplus(3000, 5000)).toBe(-2000)
    })

    it('should return 0 when income equals expenses', () => {
      expect(calculateMonthSurplus(5000, 5000)).toBe(0)
    })
  })

  describe('calculateCategoryVariance', () => {
    it('should return complete variance result', () => {
      const result = calculateCategoryVariance('Groceries', 400, 480)
      
      expect(result.category).toBe('Groceries')
      expect(result.budgeted).toBe(400)
      expect(result.actual).toBe(480)
      expect(result.variance).toBe(20)
      expect(result.varianceAmount).toBe(80)
      expect(result.status).toBe('On Track')
      expect(result.isRedFlag).toBe(false)
    })

    it('should flag significantly over budget categories', () => {
      const result = calculateCategoryVariance('Dining', 100, 200)
      
      expect(result.variance).toBe(100) // 100% over
      expect(result.status).toBe('Over Budget')
      expect(result.isRedFlag).toBe(true)
    })
  })

  describe('generateCategoryVarianceReport', () => {
    it('should generate report for all budgeted categories', () => {
      const budgets = [
        { category: 'Groceries', amount: 400 },
        { category: 'Dining', amount: 150 },
      ]
      const actuals = new Map([
        ['Groceries', 350],
        ['Dining', 200],
      ])
      
      const report = generateCategoryVarianceReport(budgets, actuals)
      
      expect(report.length).toBe(2)
      expect(report.find(r => r.category === 'Groceries')?.status).toBe('On Track')
      expect(report.find(r => r.category === 'Dining')?.status).toBe('Over Budget')
    })

    it('should include categories with spending but no budget', () => {
      const budgets = [{ category: 'Groceries', amount: 400 }]
      const actuals = new Map([
        ['Groceries', 350],
        ['Entertainment', 100], // No budget set
      ])
      
      const report = generateCategoryVarianceReport(budgets, actuals)
      
      expect(report.length).toBe(2)
      expect(report.find(r => r.category === 'Entertainment')?.isRedFlag).toBe(true)
    })

    it('should exclude transfer categories', () => {
      const budgets = [{ category: 'Transfer', amount: 500 }]
      const actuals = new Map([['Transfer', 500]])
      
      const report = generateCategoryVarianceReport(budgets, actuals)
      
      expect(report.length).toBe(0)
    })
  })

  describe('generateMonthlyBudgetReport', () => {
    const budgets = [
      { category: 'Groceries', amount: 400 },
      { category: 'Subscriptions', amount: 50 },
    ]

    it('should generate complete monthly report', () => {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const report = generateMonthlyBudgetReport(month, budgets, sampleTransactions)
      
      expect(report.month).toBe(month)
      expect(report.totalBudgeted).toBe(450)
      expect(report.categories.length).toBeGreaterThan(0)
    })

    it('should handle empty transactions', () => {
      const report = generateMonthlyBudgetReport('2025-01', budgets, [])
      
      expect(report.totalActual).toBe(0)
      expect(report.surplus).toBe(0)
      expect(report.redFlagCount).toBe(0)
    })
  })

  describe('suggestInitialBudget', () => {
    it('should suggest budget based on historical average', () => {
      const suggestion = suggestInitialBudget(sampleTransactions, 'Groceries')
      
      expect(suggestion.suggested).toBeGreaterThan(0)
      expect(suggestion.confidence).toBeDefined()
      expect(suggestion.note).toBeDefined()
    })

    it('should return 0 for category with no history', () => {
      const suggestion = suggestInitialBudget(sampleTransactions, 'NonExistentCategory')
      
      expect(suggestion.suggested).toBe(0)
      expect(suggestion.confidence).toBe('low')
    })

    it('should round to nearest $10', () => {
      const suggestion = suggestInitialBudget(sampleTransactions, 'Groceries')
      
      expect(suggestion.suggested % 10).toBe(0)
    })
  })
})
