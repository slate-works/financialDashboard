/**
 * Financial Analytics Engine
 * 
 * A collection of pure, deterministic functions for calculating financial metrics.
 * All functions are unit-testable and privacy-first (no external API calls).
 * 
 * Features:
 * 1. Budget vs. Actual (budgetVariance)
 * 2. Recurring Detection (recurringDetection)
 * 3. Expense Forecasting (expenseForecasting)
 * 4. Cash Flow Stability (cashFlowStability)
 * 5. Anomaly Detection (anomalyDetection)
 * 6. Runway & Burn Rate (runwayCalculator)
 * 7. Savings & Goals (savingsGoals)
 * 8. Debt Management (debtAnalyzer)
 * 9. Budget Adherence (adherenceTracker)
 * 10. Adaptive Budget (budgetOptimizer)
 * 11. Investment Simulator (investmentSimulator)
 * 12. Emergency Fund (emergencyFund)
 */

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

export * from './constants.js'
export * from './types.js'

// ============================================================================
// SHARED UTILITIES
// ============================================================================

export * from './utils.js'

// ============================================================================
// FEATURE MODULES
// ============================================================================

// Feature #1: Budget vs. Actual
export {
  calculateBudgetVariance,
  classifyVarianceStatus,
  isRedFlag,
  calculateMonthSurplus,
  calculateCategoryVariance,
  generateCategoryVarianceReport,
  generateMonthlyBudgetReport,
  getYTDTracking,
  detectSeasonality,
  getSeasonallyAdjustedBudget,
  suggestInitialBudget,
} from './budgetVariance.js'

// Feature #2: Recurring Detection
export {
  identifyPeriod,
  groupTransactionsByMerchant,
  filterOutliers,
  calculateConfidence,
  detectRecurringPatterns,
  matchesPattern,
  detectDuplicates,
  calculateRecurringTotal,
  type RecurringDetectionOptions,
} from './recurringDetection.js'

// Feature #3: Expense Forecasting
export {
  simpleExponentialSmoothing,
  holtsLinearSmoothing,
  holtWintersSmoothing,
  calculateConfidenceInterval,
  assessForecastConfidence,
  detectTrend,
  forecastCategory,
  forecastAllCategories,
  forecastTotalExpenses,
  type ForecastOptions,
} from './expenseForecasting.js'

// Feature #4: Cash Flow Stability
export {
  calculateCashFlowCV,
  calculateStabilityIndex,
  getStabilityRating,
  probabilityOfNegativeCF,
  analyzeRecurringExpenses,
  assessStabilityConfidence,
  generateStabilityExplanation,
  analyzeCashFlowStability,
  analyzeVolatilitySources,
  type StabilityAnalysisOptions,
  type RecurringAnalysis,
} from './cashFlowStability.js'

// Feature #5: Anomaly Detection
export {
  calculateZScore,
  zScoreToAnomalyScore,
  detectDuplicate,
  isNewMerchant,
  detectAnomaly,
  detectAnomaliesInBatch,
  summarizeAnomalies,
  type AnomalyDetectionOptions,
  type AnomalySummary,
} from './anomalyDetection.js'

// Feature #6: Runway & Burn Rate
export {
  calculateGrossBurnRate,
  calculateNetBurnRate,
  calculateRunway,
  classifyRunwayStatus,
  calculateDepletionDate,
  runScenarios,
  analyzeBurnTrend,
  generateRunwayRecommendation,
  analyzeRunway,
  calculateJobLossRunway,
  type RunwayAnalysisOptions,
} from './runwayCalculator.js'

// Feature #7: Savings & Goals
export {
  calculateSavingsRate,
  rateSavingsRate,
  calculateGoalProgress,
  calculateMonthsToCompletion,
  projectCompletionDate,
  determineGoalStatus,
  calculateRequiredMonthlyContribution,
  allocateSavingsToGoals,
  analyzeGoalProgress,
  analyzeSavings,
  projectGoalScenarios,
  type GoalInput,
  type SavingsAnalysisOptions,
} from './savingsGoals.js'

// Feature #8: Debt Management
export {
  calculateDTI,
  classifyDTIStatus,
  getDTIRecommendation,
  calculatePayoffSchedule,
  sortForAvalanche,
  sortForSnowball,
  simulatePayoff,
  comparePayoffStrategies,
  analyzeDebt,
  analyzeRefinanceOpportunity,
  type DebtAnalysisOptions,
} from './debtAnalyzer.js'

// Feature #9: Budget Adherence
export {
  calculateCategoryAdherence,
  calculateMonthlyAdherence,
  getAdherenceRating,
  analyzeAdherenceTrend,
  calculateCategoryHistory,
  identifyProblemCategories,
  generateAdherenceInsights,
  analyzeAdherence,
  type CategoryAdherenceHistory,
  type AdherenceAnalysisOptions,
} from './adherenceTracker.js'

// Feature #10: Adaptive Budget
export {
  analyzeSpendingTrend,
  assessRecommendationConfidence,
  generateCategoryRecommendation,
  calculateGoalAdjustment,
  generateAdaptiveBudget,
  identifyQuickWins,
  type SpendingTrend,
  type AdaptiveBudgetOptions,
} from './budgetOptimizer.js'

// Feature #11: Investment Simulator
export {
  INVESTMENT_DISCLAIMER,
  randomNormal,
  randomNormalWithParams,
  ASSET_CLASS_ASSUMPTIONS,
  calculateExpectedReturn,
  runSingleSimulation,
  runMonteCarloSimulation,
  compareScenarios,
  projectRetirement,
  calculateRequiredContribution,
  type ScenarioComparison,
  type RetirementProjection,
} from './investmentSimulator.js'

// Feature #12: Emergency Fund
export {
  getBaseMonthsForStability,
  assessIncomeStability,
  getDependentAdjustment,
  getHealthAdjustment,
  getJobStabilityAdjustment,
  getPartnerIncomeAdjustment,
  calculateEmergencyFund,
  getStatusExplanation,
  quickAssessment,
  estimateEssentialExpenses,
} from './emergencyFund.js'
