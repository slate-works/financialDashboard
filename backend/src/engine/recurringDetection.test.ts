/**
 * Recurring Detection Engine Tests
 */

import { describe, it, expect } from 'vitest'
import {
  identifyPeriod,
  groupTransactionsByMerchant,
  detectRecurringPatterns,
  calculateConfidence,
  detectDuplicates,
  calculateRecurringTotal,
  matchesPattern,
} from './recurringDetection.js'
import { recurringTestTransactions, monthDate } from '../__tests__/fixtures/transactions.js'

describe('Recurring Detection Engine', () => {
  describe('identifyPeriod', () => {
    it('should identify weekly (7 days)', () => {
      expect(identifyPeriod(7).period).toBe('Weekly')
      expect(identifyPeriod(6).period).toBe('Weekly')
      expect(identifyPeriod(8).period).toBe('Weekly')
    })

    it('should identify bi-weekly (14 days)', () => {
      expect(identifyPeriod(14).period).toBe('Bi-weekly')
      expect(identifyPeriod(13).period).toBe('Bi-weekly')
      expect(identifyPeriod(16).period).toBe('Bi-weekly')
    })

    it('should identify monthly (28-31 days)', () => {
      expect(identifyPeriod(30).period).toBe('Monthly')
      expect(identifyPeriod(28).period).toBe('Monthly')
      expect(identifyPeriod(31).period).toBe('Monthly')
    })

    it('should identify quarterly (90 days)', () => {
      expect(identifyPeriod(90).period).toBe('Quarterly')
      expect(identifyPeriod(87).period).toBe('Quarterly')
      expect(identifyPeriod(93).period).toBe('Quarterly')
    })

    it('should identify annual (365 days)', () => {
      expect(identifyPeriod(365).period).toBe('Annual')
      expect(identifyPeriod(358).period).toBe('Annual')
      expect(identifyPeriod(372).period).toBe('Annual')
    })

    it('should return Unknown for irregular intervals', () => {
      expect(identifyPeriod(45).period).toBe('Unknown')
      expect(identifyPeriod(200).period).toBe('Unknown')
    })
  })

  describe('groupTransactionsByMerchant', () => {
    it('should group transactions by merchant and category', () => {
      const groups = groupTransactionsByMerchant(recurringTestTransactions)
      
      // Netflix should be grouped
      const netflixKey = Array.from(groups.keys()).find(k => k.includes('netflix'))
      expect(netflixKey).toBeDefined()
      expect(groups.get(netflixKey!)?.length).toBe(6)
    })

    it('should merge similar merchants', () => {
      const transactions = [
        { id: 1, date: new Date(), description: 'Netflix Inc', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
        { id: 2, date: new Date(), description: 'NETFLIX', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
      ]
      
      const groups = groupTransactionsByMerchant(transactions)
      
      // Should be merged into one group
      expect(groups.size).toBe(1)
    })
  })

  describe('calculateConfidence', () => {
    it('should return high confidence for consistent patterns', () => {
      // 100% consistency, 0% amount variance
      expect(calculateConfidence(1.0, 0)).toBe(100)
    })

    it('should reduce confidence for amount variance', () => {
      // 100% consistency, 20% amount variance
      expect(calculateConfidence(1.0, 0.2)).toBe(80)
    })

    it('should reduce confidence for inconsistent timing', () => {
      // 80% consistency, 0% amount variance
      expect(calculateConfidence(0.8, 0)).toBe(80)
    })

    it('should compound both factors', () => {
      // 80% consistency, 20% amount variance
      expect(calculateConfidence(0.8, 0.2)).toBe(64)
    })
  })

  describe('detectRecurringPatterns', () => {
    it('should detect Netflix as confirmed monthly pattern', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      
      const netflix = patterns.find(p => p.merchant.toLowerCase().includes('netflix'))
      expect(netflix).toBeDefined()
      expect(netflix?.period).toBe('Monthly')
      expect(netflix?.status).toBe('Confirmed')
      expect(netflix?.confidence).toBeGreaterThan(70)
    })

    it('should detect salary as monthly income', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      
      const salary = patterns.find(p => p.merchant.toLowerCase().includes('employer'))
      expect(salary).toBeDefined()
      expect(salary?.period).toBe('Monthly')
      expect(salary?.avgAmount).toBe(5000)
    })

    it('should detect variable utility bills', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      
      const utility = patterns.find(p => p.merchant.toLowerCase().includes('electric'))
      expect(utility).toBeDefined()
      expect(utility?.period).toBe('Monthly')
      // Confidence should be lower due to amount variance
      expect(utility?.confidence).toBeLessThan(100)
    })

    it('should mark patterns with few occurrences as Unconfirmed', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      
      const gym = patterns.find(p => p.merchant.toLowerCase().includes('planet'))
      expect(gym).toBeDefined()
      expect(gym?.status).toBe('Unconfirmed')
    })

    it('should not detect irregular grocery purchases as recurring', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      
      const grocery = patterns.find(p => p.category === 'Groceries')
      // Groceries should not be detected as recurring (too variable)
      expect(grocery).toBeUndefined()
    })
  })

  describe('detectDuplicates', () => {
    it('should detect same-day duplicate transactions', () => {
      const transactions = [
        { id: 1, date: new Date('2025-01-15T10:00:00'), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
        { id: 2, date: new Date('2025-01-15T10:30:00'), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
      ]
      
      const duplicates = detectDuplicates(transactions)
      
      expect(duplicates.length).toBe(1)
      expect(duplicates[0]?.transaction.id).toBe(2)
      expect(duplicates[0]?.duplicateOf.id).toBe(1)
    })

    it('should not flag transactions on different days', () => {
      const transactions = [
        { id: 1, date: new Date('2025-01-15'), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
        { id: 2, date: new Date('2025-02-15'), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' as const },
      ]
      
      const duplicates = detectDuplicates(transactions)
      
      expect(duplicates.length).toBe(0)
    })
  })

  describe('calculateRecurringTotal', () => {
    it('should calculate monthly total from detected patterns', () => {
      const patterns = detectRecurringPatterns(recurringTestTransactions)
      const totals = calculateRecurringTotal(patterns)
      
      expect(totals.monthly).toBeGreaterThan(0)
      expect(totals.annual).toBe(totals.monthly * 12)
    })

    it('should only include confirmed patterns', () => {
      const patterns = [
        { merchant: 'Netflix', category: 'Subscriptions', avgAmount: 15.99, period: 'Monthly' as const, confidence: 90, status: 'Confirmed' as const, lastOccurrenceDate: new Date(), nextExpectedDate: new Date(), occurrences: 6, transactions: [] },
        { merchant: 'Gym', category: 'Health', avgAmount: 25, period: 'Monthly' as const, confidence: 60, status: 'Unconfirmed' as const, lastOccurrenceDate: new Date(), nextExpectedDate: new Date(), occurrences: 2, transactions: [] },
      ]
      
      const totals = calculateRecurringTotal(patterns)
      
      // Only Netflix should be counted
      expect(totals.monthly).toBeCloseTo(15.99, 1)
    })
  })

  describe('matchesPattern', () => {
    const pattern = {
      merchant: 'Netflix',
      category: 'Subscriptions',
      avgAmount: 15.99,
      period: 'Monthly' as const,
      confidence: 90,
      status: 'Confirmed' as const,
      lastOccurrenceDate: monthDate(1, 15),
      nextExpectedDate: monthDate(0, 15),
      occurrences: 6,
      transactions: [],
    }

    it('should match transaction that fits pattern', () => {
      const txn = {
        id: 999,
        date: monthDate(0, 15),
        description: 'Netflix',
        category: 'Subscriptions',
        amount: -15.99,
        type: 'expense' as const,
      }
      
      const result = matchesPattern(txn, pattern)
      expect(result.matches).toBe(true)
    })

    it('should not match different merchant', () => {
      const txn = {
        id: 999,
        date: monthDate(0, 15),
        description: 'Hulu',
        category: 'Subscriptions',
        amount: -15.99,
        type: 'expense' as const,
      }
      
      const result = matchesPattern(txn, pattern)
      expect(result.matches).toBe(false)
    })

    it('should not match significantly different amount', () => {
      const txn = {
        id: 999,
        date: monthDate(0, 15),
        description: 'Netflix',
        category: 'Subscriptions',
        amount: -25.99, // Too different
        type: 'expense' as const,
      }
      
      const result = matchesPattern(txn, pattern)
      expect(result.matches).toBe(false)
    })
  })
})
