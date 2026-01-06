/**
 * Expense Forecasting Engine Tests
 */

import { describe, it, expect } from 'vitest'
import {
  simpleExponentialSmoothing,
  holtsLinearSmoothing,
  calculateConfidenceInterval,
  assessForecastConfidence,
  detectTrend,
  forecastCategory,
  forecastTotalExpenses,
} from './expenseForecasting.js'
import { sampleTransactions } from '../__tests__/fixtures/transactions.js'

describe('Expense Forecasting Engine', () => {
  describe('simpleExponentialSmoothing', () => {
    it('should return mean for short series', () => {
      const { forecast } = simpleExponentialSmoothing([100, 200])
      expect(forecast).toBe(150)
    })

    it('should smooth values towards recent data', () => {
      const values = [100, 100, 100, 100, 150]
      const { forecast, smoothedValues } = simpleExponentialSmoothing(values, 0.3)
      
      // Forecast should be between 100 and 150, weighted toward recent
      expect(forecast).toBeGreaterThan(100)
      expect(forecast).toBeLessThan(150)
      expect(smoothedValues.length).toBe(values.length)
    })

    it('should handle empty array', () => {
      const { forecast } = simpleExponentialSmoothing([])
      expect(forecast).toBe(0)
    })
  })

  describe('holtsLinearSmoothing', () => {
    it('should detect upward trend', () => {
      const values = [100, 120, 140, 160, 180, 200]
      const { forecast, trend } = holtsLinearSmoothing(values, 0.3, 0.1)
      
      // Should forecast above last value due to trend
      expect(forecast).toBeGreaterThan(200)
      expect(trend).toBeGreaterThan(0)
    })

    it('should detect downward trend', () => {
      const values = [200, 180, 160, 140, 120, 100]
      const { forecast, trend } = holtsLinearSmoothing(values, 0.3, 0.1)
      
      // Should forecast below last value due to negative trend
      expect(forecast).toBeLessThan(100)
      expect(trend).toBeLessThan(0)
    })

    it('should handle stable series', () => {
      const values = [100, 100, 100, 100, 100, 100]
      const { forecast, trend } = holtsLinearSmoothing(values, 0.3, 0.1)
      
      // Forecast should be near 100
      expect(forecast).toBeCloseTo(100, 0)
      expect(Math.abs(trend)).toBeLessThan(1)
    })

    it('should never return negative forecast', () => {
      const values = [100, 80, 60, 40, 20, 5]
      const { forecast } = holtsLinearSmoothing(values, 0.3, 0.1)
      
      expect(forecast).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateConfidenceInterval', () => {
    it('should calculate symmetric interval around forecast', () => {
      const actual = [100, 110, 90, 105, 95]
      const smoothed = [100, 103, 99, 101, 99]
      const forecast = 100
      
      const ci = calculateConfidenceInterval(actual, smoothed, forecast)
      
      expect(ci.lower).toBeLessThan(forecast)
      expect(ci.upper).toBeGreaterThan(forecast)
    })

    it('should widen interval for high variance data', () => {
      const stableActual = [100, 101, 99, 100, 100]
      const volatileActual = [100, 150, 50, 120, 80]
      const smoothed = [100, 100, 100, 100, 100]
      
      const stableCI = calculateConfidenceInterval(stableActual, smoothed, 100)
      const volatileCI = calculateConfidenceInterval(volatileActual, smoothed, 100)
      
      const stableWidth = stableCI.upper - stableCI.lower
      const volatileWidth = volatileCI.upper - volatileCI.lower
      
      expect(volatileWidth).toBeGreaterThan(stableWidth)
    })
  })

  describe('assessForecastConfidence', () => {
    it('should return high confidence for low CV', () => {
      expect(assessForecastConfidence(0.1)).toBe('high')
    })

    it('should return medium confidence for moderate CV', () => {
      expect(assessForecastConfidence(0.3)).toBe('medium')
    })

    it('should return low confidence for high CV', () => {
      expect(assessForecastConfidence(0.5)).toBe('low')
    })

    it('should return insufficient for null CV', () => {
      expect(assessForecastConfidence(null)).toBe('insufficient')
    })
  })

  describe('detectTrend', () => {
    it('should detect increasing trend', () => {
      expect(detectTrend([100, 120, 140, 160, 180, 200])).toBe('increasing')
    })

    it('should detect decreasing trend', () => {
      expect(detectTrend([200, 180, 160, 140, 120, 100])).toBe('decreasing')
    })

    it('should detect stable pattern', () => {
      expect(detectTrend([100, 102, 98, 100, 101, 99])).toBe('stable')
    })

    it('should return stable for insufficient data', () => {
      expect(detectTrend([100])).toBe('stable')
    })
  })

  describe('forecastCategory', () => {
    it('should generate forecast for category with history', () => {
      const result = forecastCategory(sampleTransactions, 'Groceries')
      
      expect(result.category).toBe('Groceries')
      expect(result.forecast).toBeGreaterThan(0)
      expect(result.confidenceInterval.lower).toBeLessThan(result.forecast)
      expect(result.confidenceInterval.upper).toBeGreaterThan(result.forecast)
      expect(result.monthlyHistory.length).toBeGreaterThan(0)
    })

    it('should return insufficient for category with no history', () => {
      const result = forecastCategory(sampleTransactions, 'NonExistent')
      
      expect(result.forecast).toBe(0)
      expect(result.confidence).toBe('insufficient')
      expect(result.method).toBe('insufficient_data')
    })

    it('should apply user override when provided', () => {
      const withoutOverride = forecastCategory(sampleTransactions, 'Groceries')
      const withOverride = forecastCategory(sampleTransactions, 'Groceries', {
        userOverride: 500,
        userOverrideWeight: 0.5,
      })
      
      // With override should be pulled toward 500
      expect(withOverride.forecast).not.toBe(withoutOverride.forecast)
    })
  })

  describe('forecastTotalExpenses', () => {
    it('should sum forecasts across all categories', () => {
      const result = forecastTotalExpenses(sampleTransactions)
      
      expect(result.category).toBe('Total')
      expect(result.forecast).toBeGreaterThan(0)
      expect(result.monthlyHistory.length).toBeGreaterThan(0)
    })

    it('should propagate lowest confidence level', () => {
      // With limited data, should have lower confidence
      const limitedData = sampleTransactions.slice(0, 5)
      const result = forecastTotalExpenses(limitedData)
      
      expect(['low', 'medium', 'insufficient']).toContain(result.confidence)
    })
  })
})
