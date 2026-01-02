# Financial Metrics Documentation

This document describes the formulas, assumptions, and edge cases for all financial metrics implemented in the dashboard.

## Table of Contents

1. [Budget Variance (Feature #1)](#1-budget-variance)
2. [Recurring Detection (Feature #2)](#2-recurring-detection)
3. [Expense Forecasting (Feature #3)](#3-expense-forecasting)
4. [Cash Flow Stability (Feature #4)](#4-cash-flow-stability)
5. [Anomaly Detection (Feature #5)](#5-anomaly-detection)
6. [Financial Runway (Feature #6)](#6-financial-runway)
7. [Savings & Goals (Feature #7)](#7-savings--goals)
8. [Debt Management (Feature #8)](#8-debt-management)
9. [Budget Adherence (Feature #9)](#9-budget-adherence)
10. [Adaptive Budget (Feature #10)](#10-adaptive-budget)
11. [Investment Simulator (Feature #11)](#11-investment-simulator)
12. [Emergency Fund (Feature #12)](#12-emergency-fund)
13. [Edge Cases](#edge-cases)
14. [QA Checklist](#qa-checklist)

---

## 1. Budget Variance

### Formula

```
Variance (%) = (Actual − Budget) / Budget × 100
```

### Status Classification

| Status | Condition |
|--------|-----------|
| On Track | -20% ≤ Variance ≤ +20% |
| Over Budget | Variance > +20% |
| Under Budget | Variance < -20% |
| Red Flag | Variance > +20% (highlighted for review) |

### Assumptions
- Budgets are set per category, per month
- Transfers are excluded from budget calculations
- A category with spending but no budget is flagged as a red flag

### Edge Cases
- **No budget set**: If spending exists without a budget, variance = Infinity
- **No spending**: Variance = -100% (100% under budget)
- **Zero budget and zero spend**: Variance = 0

---

## 2. Recurring Detection

### Algorithm

1. **Group transactions** by normalized merchant name and category
2. **Filter outliers** using ±2 standard deviations or ±15% amount tolerance
3. **Calculate intervals** between consecutive transactions
4. **Detect period** from median interval:
   - Weekly: 7 ± 1 days
   - Bi-weekly: 14 ± 2 days
   - Monthly: 28-31 days ± 3 days
   - Quarterly: 90 ± 5 days
   - Annual: 365 ± 10 days
5. **Calculate confidence**:
   ```
   Confidence = Consistency × (1 − Amount_Variance_Coefficient)
   ```

### Status Classification

| Status | Condition |
|--------|-----------|
| Confirmed | ≥3 occurrences AND consistency ≥80% |
| Unconfirmed | ≥2 occurrences AND consistency ≥80% |
| Archived | User-dismissed pattern |

### Assumptions
- Fuzzy merchant matching with Levenshtein distance ≤ 2
- Amount tolerance: ±15% (accounts for variable utility bills)

---

## 3. Expense Forecasting

### Method: Exponential Smoothing

**Simple Exponential Smoothing** (for stable data):
```
S_t = α × Y_t + (1 − α) × S_(t-1)
```

**Holt's Linear Method** (for trending data):
```
Level: L_t = α × Y_t + (1 − α) × (L_(t-1) + T_(t-1))
Trend: T_t = β × (L_t − L_(t-1)) + (1 − β) × T_(t-1)
Forecast: F_(t+h) = L_t + h × T_t
```

### Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| α (alpha) | 0.3 | Level smoothing |
| β (beta) | 0.1 | Trend smoothing |
| γ (gamma) | 0.1 | Seasonal smoothing |

### Confidence Assessment

| Confidence | Condition |
|------------|-----------|
| High | CV < 20% AND ≥6 months data |
| Medium | CV < 40% AND ≥3 months data |
| Low | CV ≥ 40% OR < 3 months data |
| Insufficient | < 3 months data |

---

## 4. Cash Flow Stability

### Formula: Stability Index

```
Stability_Index = 100 × (1 − min(1, CV)) × (1 − Non_Recurring_Ratio)
```

Where:
- **CV** = Coefficient of Variation = σ / |μ| (standard deviation / mean)
- **Non_Recurring_Ratio** = Estimated non-recurring expenses / Total expenses

### Probability of Negative Cash Flow

Using the standard normal CDF:
```
P(CF < 0) = Φ(−μ / σ)
```

### Rating Scale

| Rating | Index Range |
|--------|-------------|
| Very Stable | ≥ 80 |
| Stable | 60-79 |
| Moderate | 40-59 |
| Volatile | < 40 |

---

## 5. Anomaly Detection

### Method: Z-Score Analysis

```
Z = (Value − Mean) / Standard_Deviation
```

### Classification

| Z-Score | Classification | Action |
|---------|----------------|--------|
| ≥ 3 | Extreme outlier | Review |
| 2-3 | Outlier | Flag in UI |
| < 2 | Normal | None |

### Anomaly Score (0-100)
```
Anomaly_Score = (|Z| / 3) × 100
```

### Additional Checks
- **Duplicate detection**: Same merchant, same amount, same day
- **New merchant**: First transaction with a merchant in a category

---

## 6. Financial Runway

### Formulas

**Net Burn Rate:**
```
Net_Burn = Average_Expenses − Average_Income
```

**Runway (months):**
```
Runway = Cash_On_Hand / Net_Burn_Rate
```
(Returns null/∞ if Net_Burn ≤ 0)

### Scenarios

| Scenario | Description |
|----------|-------------|
| Base Case | Current net burn rate |
| Conservative | 20% income loss |
| Best Case | 10% expense reduction |

### Status Classification

| Status | Runway |
|--------|--------|
| Critical | < 3 months |
| Caution | 3-6 months |
| Adequate | 6-12 months |
| Comfortable | > 12 months |
| Surplus | Income > Expenses (infinite runway) |

---

## 7. Savings & Goals

### Savings Rate Formula

```
Savings_Rate (%) = (Income − Expenses) / Income × 100
```

### Benchmarks (CFP Standards)

| Rating | Savings Rate |
|--------|--------------|
| Excellent | ≥ 30% |
| Good | 20-29% |
| Fair | 10-19% |
| Needs Improvement | < 10% |

### Goal Progress

```
Progress (%) = Current_Saved / Target_Amount × 100
Months_To_Completion = (Target − Current) / Monthly_Contribution
```

---

## 8. Debt Management

### Debt-to-Income Ratio

```
DTI (%) = Total_Monthly_Debt_Payments / Gross_Monthly_Income × 100
```

### DTI Classification (Lending Standards)

| Status | DTI |
|--------|-----|
| Healthy | ≤ 20% |
| Acceptable | 20-36% |
| High Risk | > 36% |

### Payoff Strategies

**Avalanche Method**: Pay highest interest rate first
- Minimizes total interest paid

**Snowball Method**: Pay smallest balance first
- Provides psychological wins

---

## 9. Budget Adherence

### Category Adherence Score

```
Score = 100 × max(0, 1 − |Variance|)
```

### Overall Adherence

Weighted average by budget amount:
```
Overall = Σ(Score_i × Budget_i) / Σ(Budget_i)
```

### Trend Analysis

| Trend | Condition |
|-------|-----------|
| Improving | +10% or more vs. previous period |
| Stable | Between -10% and +10% |
| Declining | -10% or worse |

---

## 10. Adaptive Budget

### Recommendation Triggers

| Trigger | Recommended Action |
|---------|-------------------|
| Spending > Budget × 1.15 | Increase budget |
| Spending < Budget × 0.8 | Decrease budget |
| Increasing trend > 10% | Proactive adjustment |
| Decreasing trend > 10% | Reduce budget |

### Confidence Assessment

Based on coefficient of variation:
- **High**: CV < 20%, ≥6 months data
- **Medium**: CV < 40%, ≥3 months data
- **Low**: Otherwise

---

## 11. Investment Simulator

### Monte Carlo Simulation

Generates N random portfolio paths using:
```
Monthly_Return ~ Normal(μ_monthly, σ_monthly)
```

Where:
```
μ_monthly = Annual_Return / 12
σ_monthly = Annual_StdDev / √12
```

### Percentile Outputs

| Percentile | Meaning |
|------------|---------|
| P10 | Pessimistic outcome (90% chance of doing better) |
| P50 | Median outcome |
| P90 | Optimistic outcome (10% chance of doing better) |

### Asset Class Assumptions

| Asset Class | Expected Return | Volatility |
|-------------|-----------------|------------|
| US Large Cap | 10% | 16% |
| US Small Cap | 12% | 20% |
| International | 8% | 17% |
| Bonds | 5% | 5% |
| Cash | 2% | 1% |

**⚠️ DISCLAIMER**: Simulations are for educational purposes only. Past performance does not guarantee future results.

---

## 12. Emergency Fund

### Base Recommendation by Income Stability

| Income Type | Months |
|-------------|--------|
| Stable (W-2, long tenure) | 3-6 |
| Variable (commissions, bonuses) | 6-9 |
| Highly Variable (freelance, gig) | 9-12 |

### Adjustments

| Factor | Adjustment |
|--------|------------|
| Per dependent | +1 month |
| Elevated health risk | +1 month |
| High health risk | +2 months |
| Long job tenure (10+ years) | -1 month |
| Dual income household | -1 month |
| Short job tenure (< 2 years) | +2 months |

### Status Classification

| Status | Condition |
|--------|-----------|
| Below Target | Balance < 80% of recommended |
| Adequate | Balance ≥ 80% of recommended |
| Above Target | Balance ≥ 100% of recommended |

---

## Edge Cases

### Transaction Edge Cases

| Case | Handling |
|------|----------|
| **Refunds** | Negative expense amounts reduce category totals |
| **Transfers** | Excluded from income/expense calculations (type="transfer") |
| **Credit card payments** | Detected as recurring, excluded from category spending |
| **Split transactions** | Aggregated by category |
| **Missing categories** | Assigned to "Uncategorized" |

### Data Quality Edge Cases

| Case | Handling |
|------|----------|
| **< 3 months data** | Show "Insufficient data" state |
| **Current month incomplete** | Pro-rate calculations, show confidence warning |
| **No income data** | Savings rate = 0, runway = based on expenses only |
| **No expense data** | Skip expense-based metrics |
| **Extreme outliers** | Filter using ±3 standard deviations |

### UI Edge Cases

| Case | Handling |
|------|----------|
| **Loading state** | Show skeleton placeholders |
| **API error** | Show error message with retry option |
| **No budgets configured** | Show setup prompt |
| **Zero values** | Display "--" or "N/A" instead of $0 for meaningless zeros |

---

## QA Checklist

### Budget Variance (Feature #1)
- [ ] Variance calculation is correct (verify with known values)
- [ ] Red flags appear for >20% overage
- [ ] Categories without budgets show warning
- [ ] Budget suggestions based on history are reasonable
- [ ] YTD tracking accumulates correctly

### Recurring Detection (Feature #2)
- [ ] Monthly subscriptions detected (Netflix, Spotify, etc.)
- [ ] Salary/income patterns detected
- [ ] Variable bills (utilities) detected with lower confidence
- [ ] Confidence scores displayed
- [ ] Next expected date calculated correctly

### Expense Forecasting (Feature #3)
- [ ] Forecast updates with new data
- [ ] Confidence interval shown
- [ ] Trend direction (increasing/decreasing/stable) accurate
- [ ] "Insufficient data" shown for new categories

### Cash Flow Stability (Feature #4)
- [ ] Index ranges 0-100
- [ ] Rating matches index (Very Stable, Stable, Moderate, Volatile)
- [ ] Explanation text is meaningful
- [ ] Probability calculation works

### Anomaly Detection (Feature #5)
- [ ] Large purchases flagged
- [ ] Duplicates detected
- [ ] New merchants noted
- [ ] Anomaly score 0-100
- [ ] Expected range shown

### Financial Runway (Feature #6)
- [ ] Runway months calculated correctly
- [ ] Scenarios (base/conservative/best) differ appropriately
- [ ] Status colors match severity (red/yellow/green)
- [ ] Infinite runway shown when income > expenses

### Savings & Goals (Feature #7)
- [ ] Savings rate accurate
- [ ] Goal progress percentage correct
- [ ] Projected completion date reasonable
- [ ] Goal status (on_track/off_track) accurate

### Debt Management (Feature #8)
- [ ] DTI calculation correct
- [ ] Avalanche vs Snowball comparison shows difference
- [ ] Payoff schedule generates correctly
- [ ] Interest saved calculation accurate

### Budget Adherence (Feature #9)
- [ ] Monthly adherence history shows trend
- [ ] Problem categories identified
- [ ] Insights are actionable
- [ ] Score 0-100 range

### Adaptive Budget (Feature #10)
- [ ] Recommendations based on spending trends
- [ ] Savings goal impact shown
- [ ] Confidence level indicated
- [ ] Quick wins identified

### Investment Simulator (Feature #11)
- [ ] Disclaimer prominently displayed
- [ ] Percentiles vary appropriately
- [ ] Contributions affect outcome
- [ ] Different risk profiles produce different results

### Emergency Fund (Feature #12)
- [ ] Months recommendation varies by risk factors
- [ ] Essential expenses estimated reasonably
- [ ] Status (below/adequate/above target) correct
- [ ] Rationale explains calculation

### General UI
- [ ] All tooltips explain metrics
- [ ] "Insufficient data" states displayed appropriately
- [ ] Loading skeletons shown during fetch
- [ ] Error states have retry option
- [ ] Numbers formatted consistently (currency, percentages)
- [ ] Mobile responsive
- [ ] Dark/light theme works
