/**
 * Financial Analytics Engine - Configurable Constants
 * 
 * All thresholds and parameters are defined here for easy adjustment.
 * Based on CFP standards, YNAB methodology, and financial best practices.
 */

// ============================================================================
// DATA QUALITY THRESHOLDS
// ============================================================================

/** Minimum days of data required for reliable monthly analysis */
export const MIN_DAYS_FOR_MONTHLY = 14

/** Minimum months of data for trend analysis */
export const MIN_MONTHS_FOR_TREND = 3

/** Minimum months of data for seasonality detection */
export const MIN_MONTHS_FOR_SEASONALITY = 12

/** Transaction coverage threshold for high confidence (70%) */
export const HIGH_CONFIDENCE_COVERAGE = 0.7

/** Transaction coverage threshold for medium confidence (40%) */
export const MEDIUM_CONFIDENCE_COVERAGE = 0.4

// ============================================================================
// BUDGET VARIANCE THRESHOLDS (Feature #1)
// ============================================================================

/** Variance threshold for "On Track" status (±20%) */
export const BUDGET_VARIANCE_ON_TRACK = 0.20

/** Variance threshold for red-flag alert (>20% over) */
export const BUDGET_VARIANCE_ALERT = 0.20

/** Default spend target as % of income for budget adherence */
export const DEFAULT_SPEND_TARGET_RATIO = 0.80

// ============================================================================
// RECURRING DETECTION PARAMETERS (Feature #2)
// ============================================================================

/** Amount tolerance for recurring transactions (±15%) */
export const RECURRING_AMOUNT_TOLERANCE = 0.15

/** Date tolerance for monthly transactions (±3 days) */
export const RECURRING_DATE_TOLERANCE_MONTHLY = 3

/** Date tolerance for weekly transactions (±1 day) */
export const RECURRING_DATE_TOLERANCE_WEEKLY = 1

/** Date tolerance for bi-weekly transactions (±2 days) */
export const RECURRING_DATE_TOLERANCE_BIWEEKLY = 2

/** Date tolerance for quarterly transactions (±5 days) */
export const RECURRING_DATE_TOLERANCE_QUARTERLY = 5

/** Date tolerance for annual transactions (±10 days) */
export const RECURRING_DATE_TOLERANCE_ANNUAL = 10

/** Minimum consistency for "Confirmed" status (80%) */
export const RECURRING_MIN_CONSISTENCY = 0.80

/** Minimum occurrences for "Confirmed" pattern */
export const RECURRING_MIN_OCCURRENCES_CONFIRMED = 3

/** Minimum occurrences for "Unconfirmed" pattern */
export const RECURRING_MIN_OCCURRENCES_UNCONFIRMED = 2

/** Maximum Levenshtein distance for fuzzy merchant matching */
export const MERCHANT_FUZZY_MAX_DISTANCE = 2

// ============================================================================
// FORECASTING PARAMETERS (Feature #3)
// ============================================================================

/** Default level smoothing parameter (α) */
export const FORECAST_ALPHA = 0.3

/** Default trend smoothing parameter (β) */
export const FORECAST_BETA = 0.1

/** Default seasonal smoothing parameter (γ) */
export const FORECAST_GAMMA = 0.1

/** Default forecast horizon (months) */
export const FORECAST_HORIZON = 1

/** Confidence interval for forecasts (95%) */
export const FORECAST_CONFIDENCE_INTERVAL = 1.96

/** CV threshold for "High" confidence */
export const FORECAST_HIGH_CONFIDENCE_CV = 0.2

/** CV threshold for "Medium" confidence */
export const FORECAST_MEDIUM_CONFIDENCE_CV = 0.4

// ============================================================================
// CASH FLOW STABILITY THRESHOLDS (Feature #4)
// ============================================================================

/** Coefficient of variation threshold for "unstable" classification */
export const STABILITY_UNSTABLE_CV = 0.5

/** Coefficient of variation threshold for "stable" classification */
export const STABILITY_STABLE_CV = 0.2

/** Stability index ranges */
export const STABILITY_INDEX = {
  VERY_STABLE: 80,
  STABLE: 60,
  MODERATE: 40,
} as const

// ============================================================================
// ANOMALY DETECTION THRESHOLDS (Feature #5)
// ============================================================================

/** Z-score threshold for "outlier" classification */
export const ANOMALY_ZSCORE_OUTLIER = 2

/** Z-score threshold for "extreme outlier" classification */
export const ANOMALY_ZSCORE_EXTREME = 3

/** Lookback window for anomaly detection (days) */
export const ANOMALY_LOOKBACK_DAYS = 90

/** Anomaly score threshold for "review" action */
export const ANOMALY_SCORE_REVIEW = 70

/** Anomaly score threshold for "flag in UI" action */
export const ANOMALY_SCORE_FLAG = 40

/** Time window for duplicate detection (hours) */
export const DUPLICATE_TIME_WINDOW_HOURS = 1

/** Amount tolerance for duplicate detection */
export const DUPLICATE_AMOUNT_TOLERANCE = 0.01

// ============================================================================
// RUNWAY & BURN RATE THRESHOLDS (Feature #6)
// ============================================================================

/** Critical runway threshold (months) */
export const RUNWAY_CRITICAL = 3

/** Caution runway threshold (months) */
export const RUNWAY_CAUTION = 6

/** Adequate runway threshold (months) */
export const RUNWAY_ADEQUATE = 12

/** Default income loss factor for conservative scenario */
export const RUNWAY_INCOME_LOSS_FACTOR = 0.20

/** Default expense reduction for best-case scenario */
export const RUNWAY_EXPENSE_REDUCTION = 0.10

// ============================================================================
// SAVINGS & GOALS THRESHOLDS (Feature #7)
// ============================================================================

/** Recommended savings rate target (CFP standard: 15-20%) */
export const SAVINGS_RATE_TARGET = 0.20

/** Minimum acceptable savings rate */
export const SAVINGS_RATE_LOW = 0.10

/** Excellent savings rate */
export const SAVINGS_RATE_EXCELLENT = 0.30

// ============================================================================
// DEBT-TO-INCOME THRESHOLDS (Feature #8)
// ============================================================================

/** Healthy DTI threshold */
export const DTI_HEALTHY = 0.20

/** Acceptable DTI threshold (lending standard) */
export const DTI_ACCEPTABLE = 0.36

/** High-risk DTI threshold */
export const DTI_HIGH_RISK = 0.43

/** Interest rate spread for refinance consideration */
export const REFI_RATE_SPREAD = 0.005

// ============================================================================
// BUDGET ADHERENCE THRESHOLDS (Feature #9)
// ============================================================================

/** Adherence trend improvement threshold */
export const ADHERENCE_TREND_IMPROVEMENT = 0.10

/** Adherence trend decline threshold */
export const ADHERENCE_TREND_DECLINE = -0.10

/** Excellent adherence score */
export const ADHERENCE_EXCELLENT = 90

/** Good adherence score */
export const ADHERENCE_GOOD = 70

/** Fair adherence score */
export const ADHERENCE_FAIR = 50

// ============================================================================
// ADAPTIVE BUDGET THRESHOLDS (Feature #10)
// ============================================================================

/** Spending trend threshold for budget recommendation */
export const ADAPTIVE_TREND_THRESHOLD = 0.15

/** Confidence threshold for high confidence recommendation */
export const ADAPTIVE_HIGH_CONFIDENCE_CV = 0.2

/** Confidence threshold for medium confidence recommendation */
export const ADAPTIVE_MEDIUM_CONFIDENCE_CV = 0.4

// ============================================================================
// INVESTMENT SIMULATOR PARAMETERS (Feature #11)
// ============================================================================

/** Default number of Monte Carlo simulations */
export const MONTE_CARLO_SIMULATIONS = 1000

/** Trading days per year (for annualized returns) */
export const TRADING_DAYS_PER_YEAR = 252

/** Default portfolio rebalance frequency */
export const REBALANCE_FREQUENCY_MONTHS = 3

// ============================================================================
// EMERGENCY FUND THRESHOLDS (Feature #12)
// ============================================================================

/** Base months for stable income */
export const EF_BASE_STABLE = { min: 3, max: 6 }

/** Base months for variable income */
export const EF_BASE_VARIABLE = { min: 6, max: 9 }

/** Base months for high-variable income */
export const EF_BASE_HIGH_VARIABLE = { min: 9, max: 12 }

/** Additional months per dependent */
export const EF_DEPENDENT_ADJUSTMENT = 1

/** Additional months for health risk */
export const EF_HEALTH_ADJUSTMENT = 2

/** Maximum emergency fund months */
export const EF_MAX_MONTHS = 24

/** Minimum emergency fund months */
export const EF_MIN_MONTHS = 3

// ============================================================================
// CATEGORY CLASSIFICATIONS
// ============================================================================

/** Categories typically considered "fixed" expenses */
export const FIXED_EXPENSE_CATEGORIES = [
  'Bills',
  'Rent',
  'Mortgage',
  'Insurance',
  'Subscriptions',
  'Utilities',
  'Loan',
  'Debt',
  'Phone',
  'Internet',
] as const

/** Categories typically considered "discretionary" */
export const DISCRETIONARY_CATEGORIES = [
  'Groceries',
  'Dining',
  'Entertainment',
  'Travel',
  'Shopping',
  'Hobbies',
] as const

/** Categories to exclude from budget variance (transfers, etc.) */
export const EXCLUDED_BUDGET_CATEGORIES = [
  'Transfer',
  'Credit Card Payment',
  'Internal Transfer',
] as const
