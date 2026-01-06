/**
 * Expense Forecasting Engine (Feature #3)
 * 
 * Predict next month's spending using Exponential Smoothing with seasonal adjustment.
 * Simpler and faster than ARIMA, better for short, volatile personal expense data.
 * 
 * Source: DataCamp ARIMA guide, IBKR time-series analysis
 */

import type {
  TransactionInput,
  ForecastResult,
  ConfidenceLevel,
} from './types.js'
import {
  FORECAST_ALPHA,
  FORECAST_BETA,
  FORECAST_GAMMA,
  FORECAST_CONFIDENCE_INTERVAL,
  FORECAST_HIGH_CONFIDENCE_CV,
  FORECAST_MEDIUM_CONFIDENCE_CV,
  MIN_MONTHS_FOR_SEASONALITY,
} from './constants.js'
import {
  mean,
  standardDeviation,
  coefficientOfVariation,
  getMonthlyAmountsForCategory,
  addMonths,
  getMonthKey,
} from './utils.js'

// ============================================================================
// EXPONENTIAL SMOOTHING METHODS
// ============================================================================

/**
 * Simple Exponential Smoothing (for data without trend or seasonality)
 * Good for short time series or stable spending patterns
 */
export function simpleExponentialSmoothing(
  values: number[],
  alpha = FORECAST_ALPHA
): { forecast: number; smoothedValues: number[] } {
  if (values.length === 0) {
    return { forecast: 0, smoothedValues: [] }
  }
  
  if (values.length < 3) {
    return { forecast: mean(values), smoothedValues: values }
  }
  
  // Initialize with mean of first 3 values
  const smoothed: number[] = [mean(values.slice(0, 3))]
  
  // Apply exponential smoothing
  for (let t = 1; t < values.length; t++) {
    const s = alpha * values[t]! + (1 - alpha) * smoothed[t - 1]!
    smoothed.push(s)
  }
  
  // Forecast is the last smoothed value
  return {
    forecast: smoothed[smoothed.length - 1]!,
    smoothedValues: smoothed,
  }
}

/**
 * Holt's Linear Trend Method (for data with trend but no seasonality)
 * Uses two smoothing parameters: alpha for level, beta for trend
 */
export function holtsLinearSmoothing(
  values: number[],
  alpha = FORECAST_ALPHA,
  beta = FORECAST_BETA,
  horizonMonths = 1
): { forecast: number; trend: number; smoothedValues: number[] } {
  if (values.length < 3) {
    return { forecast: mean(values), trend: 0, smoothedValues: values }
  }
  
  // Initialize level and trend
  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))
  
  let level = mean(firstHalf)
  let trend = (mean(secondHalf) - mean(firstHalf)) / Math.max(firstHalf.length, 1)
  
  const smoothed: number[] = [level]
  const trends: number[] = [trend]
  
  // Apply Holt's method
  for (let t = 1; t < values.length; t++) {
    const prevLevel = level
    level = alpha * values[t]! + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
    
    smoothed.push(level)
    trends.push(trend)
  }
  
  // Forecast h periods ahead
  const forecast = level + horizonMonths * trend
  
  return {
    forecast: Math.max(0, forecast), // Expenses can't be negative
    trend,
    smoothedValues: smoothed,
  }
}

/**
 * Holt-Winters Seasonal Method (for data with trend and seasonality)
 * Requires 12+ months of data
 */
export function holtWintersSmoothing(
  values: number[],
  alpha = FORECAST_ALPHA,
  beta = FORECAST_BETA,
  gamma = FORECAST_GAMMA,
  seasonLength = 12,
  horizonMonths = 1
): { forecast: number; seasonalIndices: number[]; smoothedValues: number[] } {
  if (values.length < seasonLength) {
    // Fall back to Holt's method if not enough data for seasonality
    const holt = holtsLinearSmoothing(values, alpha, beta, horizonMonths)
    return {
      forecast: holt.forecast,
      seasonalIndices: new Array(seasonLength).fill(1),
      smoothedValues: holt.smoothedValues,
    }
  }
  
  // Initialize seasonal indices from first year
  const firstYearMean = mean(values.slice(0, seasonLength))
  const seasonalIndices = values.slice(0, seasonLength).map(v => 
    firstYearMean > 0 ? v / firstYearMean : 1
  )
  
  // Initialize level and trend
  let level = firstYearMean
  let trend = 0
  if (values.length > seasonLength) {
    const secondYearMean = mean(values.slice(seasonLength, seasonLength * 2))
    trend = (secondYearMean - firstYearMean) / seasonLength
  }
  
  const smoothed: number[] = []
  
  // Apply Holt-Winters
  for (let t = 0; t < values.length; t++) {
    const seasonIndex = t % seasonLength
    const prevSeasonalIndex = seasonalIndices[seasonIndex]!
    
    const prevLevel = level
    level = alpha * (values[t]! / prevSeasonalIndex) + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
    seasonalIndices[seasonIndex] = gamma * (values[t]! / level) + (1 - gamma) * prevSeasonalIndex
    
    smoothed.push(level * prevSeasonalIndex)
  }
  
  // Forecast h periods ahead with seasonal adjustment
  const futureSeasonIndex = (values.length + horizonMonths - 1) % seasonLength
  const forecast = (level + horizonMonths * trend) * seasonalIndices[futureSeasonIndex]!
  
  return {
    forecast: Math.max(0, forecast),
    seasonalIndices,
    smoothedValues: smoothed,
  }
}

// ============================================================================
// CONFIDENCE INTERVAL CALCULATION
// ============================================================================

/**
 * Calculate confidence interval for forecast
 * Based on residuals (actual - predicted) standard deviation
 */
export function calculateConfidenceInterval(
  actualValues: number[],
  smoothedValues: number[],
  forecast: number,
  confidenceLevel = FORECAST_CONFIDENCE_INTERVAL
): { lower: number; upper: number } {
  if (actualValues.length !== smoothedValues.length || actualValues.length < 2) {
    // Wide interval if we can't calculate residuals
    return {
      lower: forecast * 0.5,
      upper: forecast * 1.5,
    }
  }
  
  // Calculate residuals
  const residuals = actualValues.map((actual, i) => actual - smoothedValues[i]!)
  const residualStdDev = standardDeviation(residuals)
  
  return {
    lower: Math.max(0, forecast - confidenceLevel * residualStdDev),
    upper: forecast + confidenceLevel * residualStdDev,
  }
}

/**
 * Assess forecast confidence based on coefficient of variation
 */
export function assessForecastConfidence(cv: number | null): ConfidenceLevel {
  if (cv === null) return 'insufficient'
  if (cv < FORECAST_HIGH_CONFIDENCE_CV) return 'high'
  if (cv < FORECAST_MEDIUM_CONFIDENCE_CV) return 'medium'
  return 'low'
}

// ============================================================================
// TREND DETECTION
// ============================================================================

/**
 * Detect trend direction from monthly values
 */
export function detectTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 3) return 'stable'
  
  const midpoint = Math.floor(values.length / 2)
  const firstHalfMean = mean(values.slice(0, midpoint))
  const secondHalfMean = mean(values.slice(midpoint))
  
  if (firstHalfMean === 0) return 'stable'
  
  const changePercent = (secondHalfMean - firstHalfMean) / firstHalfMean
  
  if (changePercent > 0.1) return 'increasing'
  if (changePercent < -0.1) return 'decreasing'
  return 'stable'
}

// ============================================================================
// MAIN FORECAST FUNCTION
// ============================================================================

export interface ForecastOptions {
  alpha?: number
  beta?: number
  gamma?: number
  horizonMonths?: number
  userOverride?: number
  userOverrideWeight?: number
}

/**
 * Generate expense forecast for a category
 * 
 * Chooses method based on data availability:
 * - < 3 months: Simple average
 * - 3-11 months: Holt's Linear
 * - 12+ months: Holt-Winters (seasonal)
 */
export function forecastCategory(
  transactions: TransactionInput[],
  category: string,
  options: ForecastOptions = {}
): ForecastResult {
  const {
    alpha = FORECAST_ALPHA,
    beta = FORECAST_BETA,
    gamma = FORECAST_GAMMA,
    horizonMonths = 1,
    userOverride,
    userOverrideWeight = 0.4,
  } = options
  
  // Get monthly amounts for category
  const monthlyData = getMonthlyAmountsForCategory(transactions, category)
  const values = monthlyData.map(d => d.amount)
  
  // Handle insufficient data
  if (values.length === 0) {
    return {
      category,
      forecast: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      confidence: 'insufficient',
      trend: 'stable',
      monthlyHistory: [],
      method: 'insufficient_data',
    }
  }
  
  if (values.length < 3) {
    const avg = mean(values)
    return {
      category,
      forecast: avg,
      confidenceInterval: { lower: avg * 0.5, upper: avg * 1.5 },
      confidence: 'low',
      trend: 'stable',
      monthlyHistory: monthlyData,
      method: 'simple_average',
    }
  }
  
  // Choose method based on data length
  let forecast: number
  let smoothedValues: number[]
  let method: ForecastResult['method']
  
  if (values.length >= MIN_MONTHS_FOR_SEASONALITY) {
    // Use Holt-Winters for seasonal data
    const hw = holtWintersSmoothing(values, alpha, beta, gamma, 12, horizonMonths)
    forecast = hw.forecast
    smoothedValues = hw.smoothedValues
    method = 'exponential_smoothing'
  } else {
    // Use Holt's linear for trending data
    const holt = holtsLinearSmoothing(values, alpha, beta, horizonMonths)
    forecast = holt.forecast
    smoothedValues = holt.smoothedValues
    method = 'exponential_smoothing'
  }
  
  // Apply user override if provided (weighted blend)
  if (userOverride !== undefined) {
    forecast = (1 - userOverrideWeight) * forecast + userOverrideWeight * userOverride
  }
  
  // Calculate confidence interval
  const ci = calculateConfidenceInterval(values, smoothedValues, forecast)
  
  // Assess confidence
  const cv = coefficientOfVariation(values)
  const confidence = assessForecastConfidence(cv)
  
  // Detect trend
  const trend = detectTrend(values)
  
  return {
    category,
    forecast: Math.round(forecast * 100) / 100,
    confidenceInterval: {
      lower: Math.round(ci.lower * 100) / 100,
      upper: Math.round(ci.upper * 100) / 100,
    },
    confidence,
    trend,
    monthlyHistory: monthlyData,
    method,
  }
}

/**
 * Generate forecasts for all expense categories
 */
export function forecastAllCategories(
  transactions: TransactionInput[],
  options: ForecastOptions = {}
): ForecastResult[] {
  // Get unique expense categories
  const categories = new Set<string>()
  for (const t of transactions) {
    if (t.type === 'expense') {
      categories.add(t.category)
    }
  }
  
  // Generate forecast for each category
  const results: ForecastResult[] = []
  for (const category of categories) {
    results.push(forecastCategory(transactions, category, options))
  }
  
  // Sort by forecast amount (descending)
  return results.sort((a, b) => b.forecast - a.forecast)
}

/**
 * Forecast total monthly expenses
 */
export function forecastTotalExpenses(
  transactions: TransactionInput[],
  options: ForecastOptions = {}
): ForecastResult {
  const categoryForecasts = forecastAllCategories(transactions, options)
  
  const totalForecast = categoryForecasts.reduce((sum, f) => sum + f.forecast, 0)
  const totalLower = categoryForecasts.reduce((sum, f) => sum + f.confidenceInterval.lower, 0)
  const totalUpper = categoryForecasts.reduce((sum, f) => sum + f.confidenceInterval.upper, 0)
  
  // Determine overall confidence (use lowest)
  const confidences: ConfidenceLevel[] = categoryForecasts.map(f => f.confidence)
  let overallConfidence: ConfidenceLevel = 'high'
  if (confidences.includes('insufficient')) overallConfidence = 'insufficient'
  else if (confidences.includes('low')) overallConfidence = 'low'
  else if (confidences.includes('medium')) overallConfidence = 'medium'
  
  // Build combined monthly history
  const monthlyTotals = new Map<string, number>()
  for (const forecast of categoryForecasts) {
    for (const { month, amount } of forecast.monthlyHistory) {
      const current = monthlyTotals.get(month) || 0
      monthlyTotals.set(month, current + amount)
    }
  }
  
  const monthlyHistory = Array.from(monthlyTotals.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month))
  
  return {
    category: 'Total',
    forecast: Math.round(totalForecast * 100) / 100,
    confidenceInterval: {
      lower: Math.round(totalLower * 100) / 100,
      upper: Math.round(totalUpper * 100) / 100,
    },
    confidence: overallConfidence,
    trend: detectTrend(monthlyHistory.map(m => m.amount)),
    monthlyHistory,
    method: 'exponential_smoothing',
  }
}
