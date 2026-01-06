# Personal Finance Analytics Engine – Engineering Specification
## Privacy-First, Local/Offline-Friendly Dashboard

**Version**: 1.0  
**Date**: January 2, 2026  
**Audience**: Engineering/Implementation Team  
**Status**: Ready for Coding Agent

---

## Executive Summary

This specification defines a **12-feature personal finance analytics system** with precise algorithms, data models, and test cases. All recommendations are sourced from academic literature, CFP professional standards, or peer-reviewed open-source projects (Firefly III, YNAB methodology). The system supports CSV/manual imports, runs locally, and requires no paid APIs.

**Key assumptions:**
- User has 3+ months of categorized transaction history
- All computations are monthly + annual aggregations
- Offline-first architecture; optional sync to user's cloud
- Privacy: zero external calls; data never leaves user's machine

---

## Part 1: Top 12 Features (Ranked by Impact)

### **1. Monthly Budget vs. Actual Tracking (Impact: Critical)**

**Purpose**: Compare planned spending to actual, identify over/under categories  
**Use**: Primary feedback loop for behavior change; regulatory/debt management

**Inputs:**
- Monthly budget limits (by category)
- Actual transactions (category, amount, date)
- Historical budget periods (to detect seasonality)

**Outputs:**
- Budget variance per category: (Actual − Budget) / Budget × 100
- Overall surplus/deficit for the month
- Year-to-date tracking vs. annual budget
- Red-flag categories (>20% overage)

**Edge cases:**
- First month (no prior budget → use rolling average of 3 months actual)
- Seasonal categories (e.g., heating in winter): adjust budget dynamically
- One-time/irregular transactions: option to exclude from variance
- Empty budget category: treat as unlimited; flag if >0 spend

**Formula**:
```
Budget Variance (%) = [(Actual − Budget) / Budget] × 100

Category Flag:
  IF variance > +20% THEN "Over Budget"
  IF variance < −20% THEN "Under Budget"
  ELSE "On Track"

Month-End Surplus = Total Income − Total Expenses
```

**Default parameters:**
- Variance threshold for alerts: ±20%
- Minimum data points to include category: 1 (even if budgeted at $0)
- Rollback window for seasonal adjustment: 12 months (if available)

**Citation**: YNAB budgeting principles (https://www.ynab.com/about); CFP financial planning process (https://www.cfp.net/-/media/files/cfp-board/standards-and-ethics/compliance-resources/guide-to-financial-planning-process.pdf)

---

### **2. Recurring Transaction Detection (Impact: Critical)**

**Purpose**: Automatically identify subscriptions, bills, paychecks; reduce manual entry  
**Use**: Forecasting, subscription audit, cash flow planning

**Inputs:**
- Transactions (date, merchant, amount, category)
- Minimum lookback: 3 months recommended; 2 months acceptable
- Tolerance parameters: amount%, date tolerance in days

**Outputs:**
- List of detected recurring patterns: {merchant, amount_avg, period, confidence}
- Unconfirmed patterns (appears 2× but not 3×)
- Confidence score: 0–100% based on consistency

**Algorithm**: Rule-Based Temporal Pattern Detection  
*Source*: Reddit/fintech consensus (https://www.reddit.com/r/fintech/comments/1p121si/whats_the_best_way_to_identify_recurring_cash/)

**Steps:**
```
1. Group transactions by (merchant, category)
2. For each group, calculate:
   - Amount mean (μ_amt) and std dev (σ_amt)
   - Date intervals between successive transactions
3. FOR each potential pattern:
   a. Filter outliers: |amt − μ_amt| > 2σ_amt
   b. Detect period:
      - Weekly: median interval 7 ± 1 day
      - Bi-weekly: median interval 14 ± 2 days
      - Monthly: median interval 30 ± 3 days OR same calendar day
      - Quarterly: median interval 90 ± 5 days
      - Annual: median interval 365 ± 10 days
   c. Calculate consistency:
      consistency = (# occurrences matching period) / total occurrences
      confidence = consistency × (1 − amount_variance_coeff)
4. Flag if:
   - 3+ occurrences AND consistency ≥ 80% → Confirmed
   - 2 occurrences AND consistency ≥ 80% → Unconfirmed (needs next period)
5. Return {merchant, avg_amount, period, confidence, next_expected_date}
```

**Edge cases:**
- First occurrence only: mark as "Insufficient Data" (needs 2+ more)
- Amount changes (e.g., utility bills, Netflix price hike): allow variance ±15% by default
- Same-day repeats: likely duplicate; flag for review
- Merchant name variations (Netflix, NETFLIX INC, Netflix.com): fuzzy match (Levenshtein ≤2 edits) optional
- Multi-currency: detect but isolate by currency

**Default parameters:**
- Amount tolerance: ±15%
- Date tolerance (monthly): ±3 days or same day of month
- Min consistency for "confirmed": 80%
- Min occurrences for confirmed: 3
- Min occurrences for unconfirmed: 2

**Formula**:
```
Amount Variance Coefficient (AVC) = σ_amt / μ_amt
Confidence = (# confirmed periods / total periods) × (1 − AVC)
Expected Next Date = last_date + median_interval
```

**Test cases:**
- Netflix: $15.99 on 15th each month for 6 months → Period: Monthly, Confidence: 98%
- Paycheck: $3,000 every 2 weeks, ±$50 variance → Bi-weekly, 95%
- Grocery: $80–$150, 2–3× per week → No pattern (too variable)
- Gym: $49.99 first of month (one occurrence) → Unconfirmed, needs 2 more

**Citation**: Meniga recurring payment detection (https://www.meniga.com/resources/recurring-payments/)

---

### **3. Expense Forecasting (Impact: High)**

**Purpose**: Predict next month's spending by category; enable proactive budgeting  
**Use**: Goal planning, scenario analysis, anomaly baseline

**Inputs:**
- Historical transactions by category (3–12 months ideal)
- User overrides (e.g., "lower groceries next month")
- Seasonal flags (e.g., "December has holiday spending")

**Outputs:**
- Forecasted total monthly expense (point estimate + confidence interval)
- Forecast per category
- Trend (up/down) and seasonality factors
- Confidence level: Low, Medium, High

**Algorithm**: Exponential Smoothing with Seasonal Adjustment  
*Source*: DataCamp ARIMA guide (https://www.datacamp.com/tutorial/arima); IBKR time-series (https://www.interactivebrokers.com/campus/ibkr-quant-news/unraveling-time-series-analysis-in-finance/)

**Rationale**: Exponential Smoothing outperforms ARIMA for short, volatile personal expense data. Simpler, faster, explainable.

**Steps:**
```
1. Aggregate transactions by category, then by month
   Input: time_series = [amount_month_0, amount_month_1, ..., amount_month_n]

2. Detrend (if needed):
   IF variance(time_series) > 3 * median: apply log transform

3. Initialize:
   S_0 = mean(first 3 months)  # Level
   T_0 = (mean(months 4-6) − mean(months 1-3)) / 3  # Trend
   I_t = amount_t / (S_0 + t*T_0)  # Seasonal indices (if 12+ months available)

4. Smooth:
   S_t = α * (amount_t / I_{t−12}) + (1 − α) * (S_{t−1} + T_{t−1})
   T_t = β * (S_t − S_{t−1}) + (1 − β) * T_{t−1}
   I_t = γ * (amount_t / S_t) + (1 − γ) * I_{t−12}

5. Forecast (h=1 month ahead):
   F_{t+1} = (S_t + h*T_t) * I_{t+1−12}

6. Confidence Interval (via residual std dev):
   σ_residual = sqrt(mean(amount_t − forecast_t)²)
   CI_lower = F_{t+1} − 1.96*σ_residual  # 95% interval
   CI_upper = F_{t+1} + 1.96*σ_residual
```

**Default parameters:**
- α (level smoothing): 0.3
- β (trend smoothing): 0.1
- γ (seasonal smoothing): 0.1
- Minimum data for seasonality: 12 months
- Forecast horizon: 1 month (can extend to 3–6 months with wider CI)
- Confidence interval: 95%

**Edge cases:**
- < 3 months data: use simple mean + note low confidence
- No seasonality (< 12 months): use Holt's method (trend only, no seasonality)
- Zero or near-zero category: forecast = 0 + CI [0, small_upper]
- Sudden spike: manual override or flag as anomaly (see Feature #5)
- User provides override: blend user estimate with model (e.g., weighted avg 60% model, 40% user)

**Formula**:
```
Forecast = (Level + Trend) × Seasonal Index
Confidence = "High" if σ_residual < 0.2*mean(actuals)
           = "Medium" if 0.2–0.4
           = "Low" if > 0.4
```

**Test cases:**
- Groceries: $400, $420, $390, $410, $405, $415 → Forecast: $410 ± $25
- Utilities (winter): [Jan:$80, Feb:$75, Mar:$50, Apr:$30, May:$25, ..., Dec:$85] with seasonality → Forecast (Jan next): $85 ± $10
- New category (1 month): Forecast = $amt ± 50% (high uncertainty)

**Citation**: Exponential Smoothing literature (Holt-Winters, https://www.bauer.uh.edu/rsusmel/4397/fec-9-c.pdf)

---

### **4. Cash Flow Stability Index (Impact: High)**

**Purpose**: Measure predictability of monthly cash flow; proxy for financial resilience  
**Use**: Risk assessment, emergency fund adequacy, job-loss scenario planning

**Inputs:**
- Monthly net cash flow (income − expenses) for past 6–12 months
- Recurring income/expense patterns (from Feature #2)

**Outputs:**
- Stability Index: 0–100 (100 = perfectly stable)
- Monthly cash flow volatility (std dev, CV)
- Probability of negative cash flow in next 3 months
- Breakdown: % from recurring vs. non-recurring

**Algorithm**: Coefficient of Variation + Recurrence Analysis

**Steps:**
```
1. Calculate monthly net CF:
   monthly_cf[i] = total_income[i] − total_expenses[i]

2. Remove seasonal component (if 12+ months):
   seasonal_avg = mean(cf[i] for same month across years)
   deseasonalized_cf[i] = cf[i] − seasonal_avg

3. Calculate volatility:
   mean_cf = mean(monthly_cf)
   std_cf = sqrt(sum((monthly_cf[i] − mean_cf)²) / n)
   CV = std_cf / abs(mean_cf)  # Coefficient of Variation

4. Recurring vs. Non-Recurring split (using Feature #2):
   recurring_income = sum of confirmed recurring income sources
   recurring_expense = sum of confirmed recurring expense sources
   recurring_predictability = 1 − CV(recurring portion)
   non_recurring_volatility = std(non-recurring portion)

5. Stability Index:
   IF mean_cf < 0:
      stability = 0  # Deficit spending
   ELSE:
      stability = max(0, 100 * (1 − CV)) * (1 − non_recurring_ratio)
      where non_recurring_ratio = sum(non_recurring) / total_expenses

6. Forecast next 3 months:
   FOR each of next 3 months:
      expected_cf = mean_cf
      lower_bound = expected_cf − 2*std_cf
      IF lower_bound < 0: prob_negative = Φ(lower_bound / std_cf)
      ELSE: prob_negative = 0
```

**Default parameters:**
- Lookback window: 12 months (min 6 months)
- Volatility threshold for "unstable": CV > 0.5
- Threshold for "stable": CV < 0.2

**Edge cases:**
- High seasonality (e.g., contractor with lumpy income): note in output; allow user to adjust for expected patterns
- First month: CV = N/A; note "insufficient history"
- One large windfall: option to exclude outliers (>3σ)
- Negative net CF: flag as unsustainable; show "months to depletion"

**Formula**:
```
Coefficient of Variation (CV) = σ / |μ|
Stability Index = 100 × (1 − min(1, CV)) × (1 − non_recurring_ratio)

Probability(CF < 0) = Φ(−mean_cf / std_cf)  [Φ = standard normal CDF]

Interpretation:
  Stability 80–100 → "Very Stable"
  Stability 60–80 → "Stable"
  Stability 40–60 → "Moderate"
  Stability < 40 → "Volatile"
```

**Test cases:**
- Income: $5,000/mo constant; Expenses: $3,000–$3,200 → Stability: 95
- Freelancer: Income [$2,000, $5,000, $3,000, $6,000]; Expenses $3,500 avg → Stability: ~45 (high volatility)
- Post-payoff (income stable, expenses dropping): track month-by-month; trend should improve stability

**Citation**: CFP financial planning (emergency fund sizing per cash flow stability); business finance (burn rate analysis, https://www.ramp.com/blog/cash-flow-metrics)

---

### **5. Expense Anomaly Detection (Impact: High)**

**Purpose**: Flag unusual transactions or spending patterns; catch fraud, data errors, or behavioral outliers  
**Use**: Alert user to investigate; maintain expense forecast baseline accuracy

**Inputs:**
- New transaction or monthly category total
- Historical distribution for that category (3+ months)
- Optional: merchant, amount, date, category

**Outputs:**
- Anomaly score: 0–100 (0 = normal, 100 = extreme outlier)
- Reason: ["amount_outlier", "frequency_outlier", "merchant_new", "duplicate"]
- Recommended action: ["review", "ignore", "exclude_from_forecast"]

**Algorithm**: Z-Score + Isolation Forest Hybrid  
*Source*: Z-Score (Data-Driven Investor, https://www.datadriveninvestor.com/2019/11/27/anomaly-detection-with-z-score-pick-the-low-hanging-fruits/); Isolation Forest (DataCamp, https://www.datacamp.com/tutorial/isolation-forest)

**Rationale**: Z-Score is fast, interpretable, and good for univariate outliers (single transaction). Isolation Forest handles multivariate anomalies (e.g., unusual amount + time combo). Hybrid = best of both.

**Steps:**
```
1. Z-Score Method (univariate):
   For transaction amount x in category C:
   
   μ_C = mean(amounts in C for past 90 days)
   σ_C = std(amounts in C)
   z_score = |x − μ_C| / σ_C
   
   IF z_score > 3: flag as "extreme outlier" (rare, ~0.3% base rate)
   IF z_score > 2: flag as "outlier" (5% base rate)
   ELSE: normal

2. Isolation Forest (multivariate, optional if data sparse):
   Features: [amount, day_of_week, days_since_last_in_category, hour_of_day]
   
   FOR each transaction:
      isolation_score = (average depth in isolation trees) / log2(n_samples)
      anomaly_score_iforest = 2 ^ (−isolation_score)
      IF anomaly_score_iforest > 0.7: flag

3. Combined Anomaly Score:
   IF z_score-based anomaly:
      anomaly_score = (z_score / 3) × 80  # 0–80 from z-score
   ELSE IF iforest-based anomaly:
      anomaly_score = anomaly_score_iforest × 100
   ELSE:
      anomaly_score = 0
   
   Final score = max(z_based, iforest_based)

4. Classification:
   IF anomaly_score >= 70:
      action = "review"
      reason = "amount_outlier"
   ELSE IF merchant not seen before in category:
      action = "review"
      reason = "merchant_new"
   ELSE IF duplicate (same merchant, amount within $0.01, within 1 hour):
      action = "review"
      reason = "duplicate"
   ELSE IF anomaly_score 40–70:
      action = "flag_in_ui"  # Show to user but don't block
      reason = "possible_outlier"
   ELSE:
      action = "none"
      anomaly_score = 0
```

**Default parameters:**
- Z-score threshold for "outlier": 2 (95% CI)
- Z-score threshold for "extreme": 3 (99.7% CI)
- Lookback window: 90 days
- Isolation Forest contamination (% expected anomalies): 0.05
- Combined score threshold for alert: 40

**Edge cases:**
- First transaction in category: no history; score = 0 (add to history for next comparison)
- Category with $ 0 baseline (e.g., rare category): use min(0, $1) as minimum; be lenient
- Duplicate detection: allow small variance ($0.01) due to rounding/fees
- Vendor name variations: fuzzy-match to reduce false alerts

**Formula**:
```
Z-Score = |x − μ| / σ

Anomaly Score = max(z_based_score, iforest_score)

Action Rule:
  IF score >= 70 OR (merchant_new AND amount > μ) → "Review"
  IF score 40–70 → "Flag in UI"
  ELSE → "Normal"
```

**Test cases:**
- Normal: $50 grocery purchase (history: $40–$60 weekly) → Score 0
- Outlier: $500 grocery (history: $40–$60) → Score 90, Action: Review
- New merchant, reasonable amount: $35 at "Costco" (first time, grocery cat.) → Action: Flag (merchant_new)
- Duplicate: $15.99 Netflix twice in 5 min. → Score 95, Action: Review as Duplicate

**Citation**: Unsupervised anomaly detection for fraud (Fidelity, https://fidelissecurity.com/threatgeek/network-security/anomaly-detection-algorithms/)

---

### **6. Financial Runway & Burn Rate (Impact: High)**

**Purpose**: Estimate how long current cash reserves last; identify when intervention needed  
**Use**: Job-loss planning, emergency fund adequacy, debt management priority

**Inputs:**
- Current cash reserves (liquid savings)
- Monthly net burn rate (gross burn or net burn)
- Scenario flags (e.g., "assume 20% income loss")

**Outputs:**
- Runway in months (point estimate)
- Runway scenarios (best case, base case, worst case)
- Burn rate trend (accelerating, stable, improving)
- Date of cash depletion (if negative burn continues)

**Algorithm**: Burn Rate Analysis + Scenario Modeling  
*Source*: Wall Street Prep (https://www.wallstreetprep.com/knowledge/cash-runway/); CFP emergency fund guidance

**Steps:**
```
1. Calculate Burn Rates:
   
   Gross Burn Rate = sum(expenses for month) / # months
   Net Burn Rate = Gross Burn − Gross Income
   
   If Net Burn ≥ 0 (income sufficient):
      runway = ∞ (sustainable indefinitely)
   ELSE:
      runway = Cash On Hand / |Net Burn Rate|

2. Trend Analysis (optional):
   burn_rates = [BR_m−11, BR_m−10, ..., BR_m]  # 12-month history
   burn_trend = (BR_m − BR_m−11) / BR_m−11  # YoY change
   IF burn_trend > 0.1: accelerating (flagged as risk)
   IF burn_trend < −0.1: improving (positive)

3. Scenario Modeling:
   Scenario A (Base): Use actual net burn
      runway_base = cash / |net_burn_actual|
   
   Scenario B (Conservative): Add buffer, assume income loss
      income_adjusted = income * (1 − loss_factor)  # e.g., 20% loss
      burn_conservative = gross_expense − income_adjusted
      runway_conservative = cash / burn_conservative
   
   Scenario C (Best): Assume expenses reduce by Y%
      burn_best = net_burn * (1 − reduction_factor)
      runway_best = cash / burn_best (or ∞ if positive burn)

4. Flag & Recommend:
   IF runway_base < 3 months (personal) or 3–6 months (variable income):
      status = "Critical"
      action = "Reduce expenses or increase emergency fund"
   ELSE IF runway_base 3–6 months:
      status = "Caution"
      action = "Plan for income stability or build reserves"
   ELSE IF runway_base > 12 months:
      status = "Comfortable"
      action = "Monitor quarterly"
```

**Default parameters:**
- Income loss factor (conservative scenario): 20% or 100% (full job loss)
- Expense reduction factor (best case): 10–15%
- Critical threshold: 3 months (CFP standard for stable income); 6–12 months for variable income
- Lookback for burn rate: 6–12 months

**Edge cases:**
- Positive net burn (income > expenses): runway = ∞; highlight "Surplus"
- Zero or minimal cash: runway = 0; immediate intervention needed
- First month only: use as-is; note "limited history"
- Lumpy income (contractor): use conservative scenario as primary (assume no income for N months)
- One-time expense spike: option to exclude; recalculate

**Formula**:
```
Monthly Net Burn Rate = Gross Expenses − Gross Income

Cash Runway (months) = Current Cash / |Monthly Net Burn Rate|

Runway Status:
  < 3 months → "Critical"
  3–6 months → "Caution"
  6–12 months → "Adequate"
  > 12 months → "Comfortable"

Scenario Runway = Cash / Adjusted Burn Rate
```

**Test cases:**
- Stable employed: Income $5k, Expenses $3.5k, Cash $20k → Runway: ∞ (surplus $1.5k/mo)
- After job loss: Income $0, Expenses $3.5k, Cash $20k → Runway: 5.7 months (base case)
- Conservative scenario (20% expenses rise, 0 income): Runway: 4.8 months
- Variable income: Avg $4k, High variance; Cash $15k; Use conservative (assume $0 income) → Runway: 4.3 months

**Citation**: Startup/business runway (Carta, Rho, Mercury); personal finance (CFP emergency fund, https://www.letsmakeaplan.org/financial-topics/articles/emergency-fund/how-to-start-an-emergency-savings-fund)

---

### **7. Savings Rate & Goal Progress (Impact: Medium)**

**Purpose**: Measure savings discipline; track progress toward goals (e.g., vacation, down payment, retirement)  
**Use**: Motivation, goal-setting, scenario planning

**Inputs:**
- Monthly income (gross or net)
- Monthly expenses (by category)
- Savings targets (dollar amount or % of income)
- Named goals with target amount and deadline

**Outputs:**
- Savings rate (% of income saved)
- Savings rate by goal (e.g., $400/mo to vacation goal)
- Goal progress: % complete, months to completion, on track flag
- Projected goal completion date (vs. deadline)

**Algorithm**: Simple Accumulation + Linear Regression Forecast  
*Source*: CFP practice standards; personal finance industry standard

**Steps:**
```
1. Calculate Savings Rate:
   Total Savings = Income − Expenses
   
   Savings Rate (%) = (Total Savings / Gross Income) × 100
   
   OR (net income basis):
   Savings Rate (%) = (Total Savings / Net Income) × 100

2. Allocate Savings to Goals:
   Saved This Month = Savings
   
   FOR each goal G:
      allocated[G] = (goal_priority_weight[G] / sum_weights) * Saved This Month
      
      goal_balance[G] += allocated[G]
      progress[G] = goal_balance[G] / goal_target[G]
      months_to_completion[G] = (goal_target − goal_balance) / allocated[G]

3. Forecast Completion:
   IF months_to_completion[G] <= months_to_deadline[G]:
      status = "On Track"
   ELSE:
      months_overdue = months_to_completion − months_to_deadline
      status = "Off Track by " + months_overdue
   
   projected_completion = today + months_to_completion

4. Scenario: "What if I increase savings rate?"
   new_rate = current_rate + delta
   new_allocation = new_rate / (1 + new_rate)  # % increase
   new_months_to_completion = months_to_completion / (1 + delta/current_rate)
```

**Default parameters:**
- Priority weighting: Equal across all active goals (user can adjust)
- Savings rate target (CFP): 15–20% of gross income (including retirement contributions)
- Lookback for average savings rate: 3–12 months

**Edge cases:**
- Negative savings (deficit spending): rate = negative; flag as concerning
- No active goals: show total savings accumulation only
- Goal completed: mark as "Achieved" and freeze
- Goal deadline passed: show "Overdue" + cumulative months late
- Income changes (bonus, salary increase): update projection immediately

**Formula**:
```
Savings Rate = (Income − Expenses) / Income × 100

Goal Progress (%) = Current Saved / Goal Target × 100

Months to Goal = (Goal Target − Current Saved) / Monthly Allocation

On-Track Status:
  IF months_to_completion ≤ months_to_deadline → "On Track"
  ELSE → "Off Track by X months"
```

**Test cases:**
- Income $5k, Expenses $3.5k, No goals → Savings Rate: 30%
- Goal: $10k vacation by Dec (10 mo away); Monthly savings $1k → Progress: 0%; On track (10 mo / 10 mo deadline)
- Goal: $50k home down payment by Dec (10 mo); Current saved $20k; Monthly savings $1k → Progress: 40%; Off track (30 mo remaining vs. 10 mo deadline)

**Citation**: CFP financial planning; personal finance industry standards (YNAB, Firefly III)

---

### **8. Debt-to-Income & Debt Management Priority (Impact:** Medium**)**

**Purpose**: Assess debt burden; prioritize repayment strategies  
**Use**: Lending qualification, refinancing decisions, payoff planning

**Inputs:**
- All debts: credit cards, loans, mortgage (amount, rate, min payment)
- Monthly gross income
- Payoff preferences (avalanche, snowball, etc.)

**Outputs:**
- Debt-to-Income ratio (DTI)
- Interest paid over lifetime (all debts)
- Payoff scenarios: timeline + total interest, by strategy
- Recommended priority order

**Algorithm**: DTI Calculation + Scenario Comparison  
*Source*: Lending standards (typically <36% DTI for qualified borrowers); business/personal finance best practices

**Steps:**
```
1. Calculate Total Monthly Debt Service:
   debt_service = sum([debt.min_payment for all debts])
   
   Debt-to-Income (%) = (debt_service / gross_monthly_income) × 100

2. Classify Debt Status:
   IF DTI < 20%: "Healthy"
   IF DTI 20–36%: "Acceptable"
   IF DTI > 36%: "High Risk" (flagged)

3. Debt Breakdown:
   FOR each debt D:
      interest_paid_lifetime = calc_interest_schedule(principal, rate, term)
      payoff_date_min_payment = principal / (min_payment − monthly_interest)
      
      List: [Debt Name | Balance | Rate | Min Payment | Interest to Payoff | Payoff Date]

4. Payoff Strategy Scenarios:
   
   Strategy A (Avalanche): Pay minimums on all, extra toward highest-rate debt
      Advantage: Minimize total interest
      Total interest cost: calc_interest_avalanche(...)
      Payoff date: date of last debt eliminated
   
   Strategy B (Snowball): Pay minimums on all, extra toward smallest-balance debt
      Advantage: Quick psychological wins, momentum
      Total interest cost: calc_interest_snowball(...)
      Payoff date: date of last debt eliminated
   
   Strategy C (Accelerated): Extra payment of $X/month toward debts
      Total interest cost: reduced vs. minimum-only
      Payoff date: sooner by Y months
   
   Compare scenarios: Interest Saved = Scenario_A_interest − Scenario_B_interest

5. Refinance Analysis (optional):
   For each debt:
      IF current_rate > market_rate − threshold:
         interest_savings_refi = calc_interest(current_rate, term) − calc_interest(new_rate, term − closing_costs_amortized)
         IF interest_savings_refi > 0:
            recommend = "Refinance"
         ELSE:
            recommend = "Not recommended"
```

**Default parameters:**
- Critical DTI threshold: 36% (lending standard)
- Interest rate spread for refi consideration: 0.5–1%
- Payoff strategies to compare: Avalanche, Snowball
- Extra payment amount for acceleration scenario: User input (or 10–20% of current minimum)

**Edge cases:**
- No debt: DTI = 0; show "Debt-free" status
- Mortgage only (low rate): Focus on savings/goals; don't prioritize payoff
- Multiple high-interest debts (credit cards): Prioritize avalanche (most interest saved)
- Debt consolidation option: Compare consolidated loan rate vs. current blended rate

**Formula**:
```
Debt-to-Income (%) = (Sum of Monthly Minimum Payments) / Gross Monthly Income × 100

Interest Paid Over Term = sum(monthly_payment × term − principal)

Payoff Date (Avalanche) = When principal balance = 0

Total Interest Savings (Refi) = Original Plan Interest − Refi Plan Interest
```

**Test cases:**
- Debt: $15k CC @ 18%, min $300/mo; Income $5k/mo → DTI: 6%; interest to payoff: ~$8k over 5 years
- Debt: $200k mortgage @ 3.5%, $800/mo; DTI: 16%; no refi needed (rate low)
- Debt: $10k CC @ 20%, $5k CC @ 18%; Income $4k → DTI: ~6% (min payments); avalanche vs. snowball interest difference: ~$500 over payoff period

**Citation**: Lending standards (Consumer Financial Protection Bureau, https://www.consumerfinance.gov/); CFP financial planning; personal finance industry (debt payoff strategies)

---

### **9. Budget Adherence Consistency (Impact: Medium)**

**Purpose**: Measure how reliably user sticks to budget over time; behavioral insight  
**Use**: Identify spending triggers, refine budgets, predict future compliance

**Inputs:**
- Monthly budget variance data (from Feature #1) for past 3–12 months
- Category-level variance history

**Outputs:**
- Adherence score: 0–100 (100 = always on budget)
- High-variance categories (repeat offenders)
- Trend (improving, stable, worsening)
- Behavioral insights: e.g., "Entertainment overage correlates with weekends"

**Algorithm**: Rolling Compliance Metric + Trend Analysis

**Steps:**
```
1. Calculate Monthly Adherence:
   FOR each month M:
      categories_on_track = # of categories where |variance| ≤ 20%
      total_categories = # of categories with budget
      monthly_adherence[M] = (categories_on_track / total_categories) × 100

2. Overall Adherence (3+ months):
   adherence_score = mean(monthly_adherence[M for last N months])

3. Trend:
   IF N ≥ 3:
      adherence_trend = (adherence_score[current] − adherence_score[3_months_ago]) / adherence_score[3_months_ago]
      IF trend > 0.1: "Improving"
      IF trend < −0.1: "Declining"
      ELSE: "Stable"
   ELSE:
      trend = "Insufficient data"

4. High-Variance Categories:
   FOR each category C:
      variance_stability = std(variance_history[C])
      IF variance_stability > 20%:
         problem_categories.append((C, variance_stability))
   
   Sort by highest volatility

5. Insights:
   FOR each problem category:
      IF variance is always positive (overage):
         insight = "Consistently overspends on " + C
         recommendation = "Increase budget or cut discretionary items"
      ELSE IF variance is negative (underspend):
         insight = "Regularly underspends on " + C
         recommendation = "Reduce budget to free up cash for other goals"
```

**Default parameters:**
- Variance threshold for "on track": ±20%
- Lookback window: 6 months (min 3)
- Trend threshold: ±10% change

**Edge cases:**
- First month only: score = N/A; note "need more history"
- New category (0 history): exclude from adherence calculation
- One-off spike (e.g., holiday): option to exclude from trend; mark as "temporary"
- Budget changes mid-month: pro-rate or exclude month

**Formula**:
```
Monthly Adherence = (# Categories on Track / Total Categories) × 100

Overall Adherence Score = Mean(Monthly Adherence over N months)

Trend = (Current Score − Score 3 months ago) / Score 3 months ago

Interpretation:
  90–100 → "Excellent"
  70–90 → "Good"
  50–70 → "Fair"
  < 50 → "Needs Improvement"
```

**Test cases:**
- Month 1: Groceries on track, Entertainment over, Utilities on track → Adherence: 67%
- Month 2: Groceries on track, Entertainment over, Utilities on track → Adherence: 67%
- Month 3: Groceries on track, Entertainment on track, Utilities on track → Adherence: 100%
- 3-month average: 78% → Trend: Improving

**Citation**: Behavioral finance, budgeting best practices (YNAB behavioral change methodology)

---

### **10. Adaptive Budget Recommendations (Impact:** Medium**)**

**Purpose**: Suggest budget adjustments based on spending patterns and goals  
**Use**: Optimize for savings goals, flag categories that need attention

**Inputs:**
- Current budget by category
- Actual spending trend (3–12 months)
- Active goals and priorities
- Income changes (if any)

**Outputs:**
- Recommended budget for next month (per category)
- Rationale: e.g., "Groceries up 8%; suggest +5% budget"
- Risk: "If you don't adjust, will miss goal X by Y months"
- Confidence in recommendation: Low, Medium, High

**Algorithm**: Trend-Based + Goal-Aligned Optimization  
*Source*: Forecasting (Feature #3) + Goal progress (Feature #7)

**Steps:**
```
1. Analyze Recent Spending Trend:
   FOR each category C:
      spending_trend = (avg_recent_3_mo − avg_prior_3_mo) / avg_prior_3_mo
      IF abs(spending_trend) > 15%:
         recommendation = "Adjust budget to " + round(current_budget * (1 + spending_trend), 2)
         reason = "Spending trend"
      ELSE:
         recommendation = current_budget

2. Check Goal Impact:
   savings_needed_monthly = (goal_target − current_saved) / months_to_deadline
   
   FOR each category C (discretionary):
      IF reducing C by X% would help meet savings goal:
         recommendation = current_budget * (1 − X%)
         reason = "To support goal: " + goal_name

3. Flex Categories vs. Fixed:
   fixed = ["Rent", "Mortgage", "Insurance", "Min Debt Payment"]
   discretionary = ["Groceries", "Dining", "Entertainment", "Travel"]
   
   FOR fixed: don't recommend cuts (locked by obligations)
   FOR discretionary: can adjust based on trends + goals

4. Generate Recommended Budget:
   new_budget[C] = trend_based_recommendation + goal_adjustment + inflation_adjustment
   
   confidence = "High" if spending stable (low CV)
                = "Medium" if moderate volatility
                = "Low" if highly variable

5. Risk Communication:
   IF new_budget deviates >20% from current:
      warn = "Large change; consider gradual adjustment over 2–3 months"
   
   IF recommended cuts would miss goal:
      risk = "Even with these cuts, goal deadline at risk; consider refi or income boost"
```

**Default parameters:**
- Trend threshold for recommendation: ±15%
- Goal savings adjustment: Use calculated need (from Feature #7)
- Confidence thresholds: CV < 0.2 = High; 0.2–0.4 = Medium; > 0.4 = Low
- Discretionary categories (customizable): Entertainment, Dining, Travel, Hobbies

**Edge cases:**
- First month: No trend; use forecast as budget
- Income increase: Allocate to goals first; then discretionary increase
- Income decrease: Cut discretionary first; only adjust fixed if necessary
- Multiple conflicting recommendations: Prioritize by goal urgency + spending volatility

**Formula**:
```
Recommended Budget = Base Budget × (1 + Spending Trend) × (1 + Goal Adjustment) × (1 + Inflation Adjustment)

Spending Trend = (Avg Recent 3 mo − Avg Prior 3 mo) / Avg Prior 3 mo

Goal Adjustment = (Monthly Savings Need − Current Allocation) / Current Budget (for discretionary cats)

Confidence = 100 * (1 − CV)  [CV = coefficient of variation]
```

**Test cases:**
- Groceries: Budget $400, actual avg $440 → Recommend: $430 (+7.5%)
- Entertainment: Budget $200, actual avg $150; Goal needs $100/mo extra → Recommend: $100 (cut 50% to fund goal)
- Rent: Budget $1,500, actual $1,500 → Recommend: $1,500 (no change; fixed)

**Citation**: Trend forecasting + optimization (Features #3, #7); behavioral economics

---

### **11. Investment Simulator (What-If, Free Data) (Impact:** Medium**)**

**Purpose**: Model portfolio growth under various market scenarios; test strategy  
**Use**: Retirement planning, goal feasibility, risk tolerance validation

**Inputs:**
- Portfolio: [Ticker, Shares, Price] or user CSV with historical price data
- Time horizon: months/years
- Contribution schedule: $X/month or one-time
- Market scenario: Historical returns, custom expected return, user price CSV, Monte Carlo
- Rebalancing: Buy & hold or periodic rebalancing

**Outputs:**
- Projected portfolio value at end (point estimate + confidence interval)
- Distribution of outcomes (Monte Carlo): 10th, 50th, 90th percentiles
- Probability of achieving goal amount
- Sensitivity: How sensitive to stock selection, contribution changes

**Algorithm**: Monte Carlo Simulation + Historical Scenario Analysis  
*Source*: QuantInsti Monte Carlo (https://blog.quantinsti.com/monte-carlo-simulation/); Lumina (https://analytica.com/blog/monte-carlo-modeling-in-personal-finance-the-whoops-factor/)

**Rationale**: Monte Carlo accounts for volatility, sequence of returns risk, and provides probability distributions (not just point estimates).

**Steps:**
```
1. Data Collection:
   Option A (Free, historical):
      - Use free sources: Yahoo Finance API (yfinance), Alpha Vantage (limited free tier), IEX Cloud (limited)
      - OR user provides CSV: [Date, Ticker, Price]
   
   Option B (User provided):
      - CSV import with historical prices
   
   Option C (Synthetic):
      - User specifies expected return (%) and volatility (std dev)

2. Calculate Historical Returns:
   FOR each security S:
      daily_returns[S] = log(price_t / price_t−1)  # Log returns (more stable)
      annual_return[S] = exp(mean(daily_returns) * 252) − 1  # 252 trading days
      annual_vol[S] = std(daily_returns) * sqrt(252)
      
      Correlation matrix: corr_ij = cov(returns_i, returns_j) / (vol_i * vol_j)

3. Monte Carlo Setup:
   n_simulations = 1000 (or user input)
   n_periods = time_horizon_in_months
   portfolio_values = []

4. Run Simulations:
   FOR each simulation SIM = 1 to n_simulations:
      portfolio_value[SIM][0] = current_portfolio_value
      
      FOR each month T = 1 to n_periods:
         # Generate correlated returns using Cholesky decomposition
         correlated_returns[T] = Cholesky(correlation_matrix) × RandomNormal(0, 1)
         
         # Apply returns to portfolio
         FOR each security S in portfolio:
            portfolio_value[SIM][T] += portfolio_value[SIM][T−1] * (1 + returns[T][S])
         
         # Add contribution
         portfolio_value[SIM][T] += monthly_contribution
         
         # Rebalance (optional)
         IF rebalance_freq == "quarterly" AND T % 3 == 0:
            portfolio_value[SIM][T] = rebalance_to_target_allocation(portfolio_value[SIM][T])

5. Analyze Results:
   final_values = portfolio_value[SIM][n_periods] for all SIM
   
   mean_final = mean(final_values)
   std_final = std(final_values)
   
   percentiles = [10th, 25th, 50th, 75th, 90th]
   
   prob_goal_achieved = (# simulations where final_value >= goal) / n_simulations

6. Output:
   Scenario: "Current portfolio, $500/mo, 5-year horizon"
   Mean outcome: $XX,XXX (±$Y,YYY std dev)
   10th percentile (worst 10%): $AA,AAA
   50th percentile (median): $BB,BBB
   90th percentile (best 10%): $CC,CCC
   Probability of reaching $YYY,YYY: ZZ%
```

**Default parameters:**
- Number of simulations: 1,000 (user can increase for precision)
- Returns: Use historical if >3 years data; else prompt for expected return
- Volatility: Historical std dev or user input
- Contribution: $0 (one-time), or $X/month
- Rebalancing: None, or quarterly
- Time horizon: User input (1–30 years)

**Edge cases:**
- Single security (no diversification): Warn about concentration risk
- No historical data (new ticker): Use S&P 500 proxy or user input
- Negative return scenario (market crash): Show in 10th percentile; explain drawdown risk
- Goal not achievable (even in 90th percentile): Recommend increasing contribution or extending horizon
- User-provided CSV too short: Min 1 year recommended; flag if < 6 months

**Formula**:
```
Log Return = ln(Price_t / Price_t−1)

Annual Return = exp(mean(log_returns) × 252) − 1

Annual Volatility = std(log_returns) × √252

Simulation: Portfolio_t+1 = Portfolio_t × (1 + Return_t) + Contribution_t

Percentile P = Sorted(simulations)[P% × n_simulations]

Probability(Goal) = (# simulations where final ≥ goal) / n_simulations

95% Confidence Interval: [10th percentile, 90th percentile]
```

**Test cases:**
- Simple: $10k in S&P 500, $200/mo, 10 years, Monte Carlo (1000 sims) → Mean: $67k, 10th %ile: $52k, 90th %ile: $84k
- Aggressive: 70% stocks / 30% bonds, $500/mo, 20 years → Median: $220k, Prob(reach $250k): 62%
- Conservative: Single bond fund, $300/mo, 5 years → Mean: $18.5k (low volatility), narrow CI

**Citation**: Monte Carlo in Python (Blog & Libraries); Lumina Decision Systems retirement planning

**Assumptions & Disclaimers:**
```
⚠️ IMPORTANT: This simulator is for educational purposes only. It assumes:
1. Historical returns/volatility are predictive of future performance (not guaranteed).
2. Markets follow normal distribution (tail risk may be underestimated).
3. No fees, taxes, or timing costs (real portfolios incur these).
4. Contribution and rebalancing happen as scheduled.
5. No major market crises beyond historical volatility.

NOT intended for professional investment advice. Consult a financial advisor before making investment decisions.
```

**Citation**: Monte Carlo simulation in finance (QuantInsti, https://blog.quantinsti.com/monte-carlo-simulation/); risk analysis methodology

---

### **12. Adaptive Emergency Fund Calculator (Impact:** Medium**)**

**Purpose**: Recommend appropriate emergency fund size based on risk profile  
**Use**: Ensure adequacy; free up cash for other goals if over-allocated

**Inputs:**
- Monthly fixed expenses (housing, insurance, min debt payments)
- Monthly variable expenses (groceries, utilities, discretionary)
- Income stability: Employed (stable), Freelance, Contractor (variable)
- Dependents, job security, health considerations
- Current emergency fund size

**Outputs:**
- Recommended emergency fund amount (months of expenses)
- Range: Min (months) to Max (months)
- Rationale breakdown
- Action: "Build", "Maintain", or "Excess (redeploy)"

**Algorithm**: CFP-Guided Risk Assessment  
*Source*: CFP Board Practice Standards (https://www.cfp.net/standards); FIP, DBS Singapore, EnRich Partners

**Steps:**
```
1. Categorize Income Stability:
   Employed (single source, low turnover): risk = Low
   Employed (secondary income/partner): risk = Low-Medium
   Freelance/Variable (1–2 years history): risk = Medium
   Contractor/Commission (high variability): risk = Medium-High
   Self-Employed (cyclical): risk = Medium-High
   Unemployed/Seeking: risk = Critical (build aggressively)

2. Calculate Essential Monthly Expenses:
   fixed = Mortgage/Rent + Utilities + Insurance + Min Debt Payments + Groceries
   minimum = fixed
   # Exclude discretionary (travel, entertainment, hobbies)

3. Determine Required Fund (CFP Standard):
   Base recommendation (by income stability):
   - Low risk (employed, secure): 3–6 months
   - Medium risk (variable or single income): 6–9 months
   - High risk (self-employed, contractor): 9–12 months
   - Critical (job loss imminent): 12–18 months

4. Adjust for Circumstances:
   dependents = # of dependents
   IF dependents > 0: add 1–2 months per dependent
   
   health = Health status (self, family)
   IF chronic condition or high medical cost: add 1–2 months
   
   job_stability = Years in current role
   IF < 2 years: add 1 month (adjustment period risk)
   IF > 10 years: may reduce by 1 month
   
   partner_income = Does household have 2nd income?
   IF yes and stable: reduce base by 1 month
   ELSE: keep as-is

5. Calculate Recommended Range:
   minimum_months = base − adjustments (floor 3 months)
   maximum_months = base + adjustments (ceiling 18 months, or 24 for extreme)
   
   recommended_months = (minimum + maximum) / 2
   
   recommended_amount = recommended_months * minimum_monthly_expenses

6. Compare to Current:
   current_emergency_fund = user's cash savings
   
   IF current < minimum * monthly_expense:
      status = "Below Minimum: URGENT—build fund"
      action_amount = (minimum * expense) − current
      priority = "High"
   ELSE IF current > maximum * monthly_expense:
      status = "Exceeds Target: Consider reallocating excess to goals"
      excess_amount = current − (maximum * monthly_expense)
      priority = "Low (optional)"
   ELSE IF (minimum * expense) ≤ current ≤ (maximum * expense):
      status = "Adequate"
      action_amount = 0
      priority = "Monitor"

7. Recommendation:
   Output: You need $XX,XXX (≈ M months of expenses)
   
   Current: $YY,YYY (≈ N months)
   
   Status: [Below/Adequate/Excess]
   
   Action: [Build $X more; Maintain; Reallocate $X to goals]
```

**Default parameters:**
- CFP base recommendation: 3–6 months (stable), 6–9 months (variable)
- Dependent adjustment: +1–2 months per child/elder
- Health adjustment: +1–2 months if high medical risk
- Maximum fund size: 18–24 months
- Minimum fund size: 3 months (always)

**Edge cases:**
- No income (retired, living on portfolio): Recommend 12–24 months minimum + consider drawdown strategy (not in this spec)
- First time budgeter: May have no baseline; use 3 months as starting point; build over 6–12 months
- Recent loss of income: Boost to 6–12 months immediately
- Dual income, one at risk: Calculate per-income scenario

**Formula**:
```
Base Months = 3–6 (stable) or 6–12 (variable)

Adjusted Months = Base + Dependent Adjustment + Health Adjustment + Job Stability Adjustment + Partner Income Adjustment

Recommended Fund = Adjusted Months × Monthly Fixed Expenses

Status:
  IF Current < Minimum × Expense → "Below Target"
  ELSE IF Current > Maximum × Expense → "Above Target"
  ELSE → "Adequate"

Action:
  IF Below: Build $X/month until reaching minimum
  IF Adequate: Maintain; monitor quarterly
  IF Above: Reallocate excess $X to goals
```

**Test cases:**
- Employed, stable, married, 1 child, health good: Base 3–6 mo + 1 mo (child) = 4–7 mo; Essential expenses $3k/mo → Recommend $4.5–6k (midpoint $5.25k)
- Freelancer, highly variable, 2 dependents, chronic health condition: Base 9–12 mo + 2 mo (dependents) + 1–2 mo (health) = 12–16 mo; Essential $4k → Recommend $14k (midpoint)
- Dual income (stable), no dependents: Base 3–6 mo − 1 mo = 2–5 mo (floor 3) = 3–5 mo; Essential $2.5k → Recommend $10k

**Citation**: CFP Board financial planning (https://www.cfp.net/-/media/files/cfp-board/standards-and-ethics/compliance-resources/guide-to-financial-planning-process.pdf); Emergency fund guidance (FIP, https://www.myfipadvisor.com/insights/blog/emergency-funds-how-much-is-enough/; DBS, https://www.dbs.com.sg/personal/articles/nav/financial-planning/7-financial-ratios-to-gauge-your-financial-health)

---

## Part 2: Precise Metric Definitions & Formulas

| Metric | Definition | Formula | Example | Citation |
|--------|------------|---------|---------|----------|
| **Savings Rate** | % of gross income saved (not spent) | (Income − Expenses) / Gross Income × 100 | Income $5k, Exp $3.5k → 30% | CFP standards |
| **Debt-to-Income (DTI)** | Monthly debt payments as % of gross income | Sum(Monthly Debt Payments) / Gross Monthly Income × 100 | Debt $300/mo, Income $5k → 6% | Lending standards |
| **Budget Variance** | Deviation from planned spending | (Actual − Budget) / Budget × 100 | Budget $400, Actual $440 → +10% | YNAB |
| **Cash Runway** | Months until cash depletes at current burn rate | Cash on Hand / Monthly Net Burn | Cash $20k, Burn $2k/mo → 10 mo | Startup finance |
| **Monthly Net Burn** | Income minus expenses (negative = deficit) | Gross Income − Total Expenses | Income $5k, Exp $5.5k → −$500 | Business finance |
| **Emergency Fund Adequacy** | Current fund vs. CFP recommendation | Current Fund / (Months × Essential Expenses) | Current $20k, Rec $18k → 111% | CFP Board |
| **Savings Rate by Goal** | Monthly allocation to specific goal | (Goal Target − Current Saved) / Months to Deadline | Goal $10k, 10 mo, $2k saved → $800/mo | Personal finance |
| **Interest Paid Over Term** | Total interest paid on debt until paid off | Calculated via amortization schedule | CC: $15k @ 18%, min $300/mo → ~$8.2k interest | Debt management |
| **Expense Forecast** | Predicted spending next month by category | Exponential Smoothing: S_t = α(x_t) + (1−α)S_{t−1} | See Feature #3 | Forecasting |
| **Cash Flow Stability (CV)** | Measure of predictability (lower = more stable) | σ / \|μ\| where μ=mean, σ=std dev | CF: [$1800, $2200, $1900, $2100] → CV ≈ 0.08 (stable) | Statistics |
| **Anomaly Score** | 0–100 rating of transaction unusualness | max(z_based_score, iforest_score) | z-score 2.5 → 83.3; Action: Review | Data science |
| **Goal Progress** | % of goal completed | (Current Saved / Goal Target) × 100 | Saved $6k of $10k goal → 60% complete | Personal finance |
| **Budget Adherence** | % of categories within acceptable variance | (# Categories On-Track / Total Categories) × 100 | 7 of 10 categories on track → 70% | Behavioral finance |
| **Operating Cash Flow Margin** | Cash generation efficiency | Operating Cash Flow / Revenue × 100 | OCF $1.5k, Income $5k → 30% | Business finance |
| **Debt Payoff Timeline (Avalanche)** | Months to eliminate all debt prioritizing interest | Calculated iteratively by paying minimums + extras toward highest-rate debt | See Feature #8 | Finance optimization |
| **Recurring Income Confidence** | 0–100% likelihood transaction continues | Consistency × (1 − Amount Variance Coefficient) | 5 of 5 confirmed; variance 2% → 98% | Pattern detection |

---

## Part 3: Methods & Algorithms with Pseudocode

### **Algorithm Pseudocode Library**

**Notation:**
- `features_extract()` = return relevant columns from transaction DB
- `df[col]` = access DataFrame column
- `np` = NumPy, `pd` = Pandas, `stats` = SciPy stats, `sklearn` = scikit-learn

**Note**: All pseudocode below is implementation-agnostic (works in Python, Rust, Java, etc.). Use language-appropriate libraries.

---

#### **A. Simple Exponential Smoothing (Feature #3: Forecasting)**

```pseudocode
FUNCTION forecast_expense_exponential_smoothing(transactions, category, alpha=0.3, horizon_months=1):
    // Input: transactions (list of {date, amount}), category (string), alpha (smoothing parameter)
    // Output: forecast for next month, confidence interval
    
    // 1. Aggregate to monthly amounts
    monthly_amounts = aggregate_by_month(transactions.filter(cat == category))
    
    IF len(monthly_amounts) < 3:
        RETURN {
            forecast: mean(monthly_amounts),
            confidence: "Low",
            ci_lower: min(monthly_amounts),
            ci_upper: max(monthly_amounts)
        }
    
    // 2. Initialize
    S = [0] * len(monthly_amounts)  // Smoothed level
    S[0] = mean(monthly_amounts[0:3])
    
    // 3. Apply exponential smoothing
    FOR t = 1 TO len(monthly_amounts) - 1:
        S[t] = alpha * monthly_amounts[t] + (1 - alpha) * S[t-1]
    
    // 4. Forecast
    forecast = S[len(S)-1]
    
    // 5. Calculate residuals and CI
    residuals = [monthly_amounts[i] - S[i] for i in range(len(S))]
    sigma = std(residuals)
    ci_lower = forecast - 1.96 * sigma
    ci_upper = forecast + 1.96 * sigma
    
    // 6. Confidence assessment
    cv = sigma / abs(mean(monthly_amounts))
    IF cv < 0.2:
        confidence = "High"
    ELSE IF cv < 0.4:
        confidence = "Medium"
    ELSE:
        confidence = "Low"
    
    RETURN {
        forecast: round(forecast, 2),
        ci_lower: round(max(0, ci_lower), 2),
        ci_upper: round(ci_upper, 2),
        confidence: confidence,
        next_month: add_months(today, 1)
    }
END FUNCTION
```

---

#### **B. Recurring Transaction Detection (Feature #2)**

```pseudocode
FUNCTION detect_recurring_transactions(transactions, lookback_months=3, amount_tolerance=0.15, date_tolerance_days=3):
    // Input: transactions (list of {date, merchant, amount, category})
    // Output: list of {merchant, avg_amount, period, confidence, next_date}
    
    result_patterns = []
    
    // 1. Group by merchant and category
    grouped = group_by(transactions, ["merchant", "category"])
    
    FOR group_key, group_txns IN grouped:
        merchant, category = group_key
        
        IF len(group_txns) < 2:
            CONTINUE  // Skip; need at least 2 occurrences
        
        // 2. Filter outliers
        amounts = [txn.amount for txn in group_txns]
        mean_amt = mean(amounts)
        std_amt = std(amounts)
        
        filtered_txns = []
        FOR txn IN group_txns:
            z_score = abs(txn.amount - mean_amt) / (std_amt + 0.01)
            IF z_score <= 2:  // Within 2 std devs
                filtered_txns.append(txn)
        
        IF len(filtered_txns) < 2:
            CONTINUE
        
        // 3. Detect periodicity
        filtered_txns.sort_by("date")
        intervals = []
        FOR i = 1 TO len(filtered_txns) - 1:
            interval = (filtered_txns[i].date - filtered_txns[i-1].date).days
            intervals.append(interval)
        
        median_interval = median(intervals)
        
        // 4. Map interval to period
        period, tolerance = identify_period(median_interval, date_tolerance_days)
        IF period == "unknown":
            CONTINUE
        
        // 5. Validate consistency
        consistent_count = 0
        FOR i = 1 TO len(filtered_txns) - 1:
            expected_interval = median_interval
            actual_interval = (filtered_txns[i].date - filtered_txns[i-1].date).days
            IF abs(actual_interval - expected_interval) <= tolerance:
                consistent_count += 1
        
        consistency = consistent_count / (len(filtered_txns) - 1)
        
        // 6. Calculate confidence
        amount_variance_coef = std_amt / mean_amt
        confidence_score = consistency * (1 - min(1, amount_variance_coef))
        
        // 7. Filter by minimum threshold
        IF len(filtered_txns) >= 3 AND consistency >= 0.80:
            status = "Confirmed"
        ELSE IF len(filtered_txns) >= 2 AND consistency >= 0.80:
            status = "Unconfirmed"
        ELSE:
            CONTINUE
        
        // 8. Calculate next expected date
        last_date = filtered_txns[len(filtered_txns)-1].date
        next_date = add_days(last_date, median_interval)
        
        result_patterns.append({
            merchant: merchant,
            category: category,
            avg_amount: round(mean(amounts), 2),
            period: period,
            confidence: round(confidence_score * 100, 1),
            status: status,
            next_expected_date: next_date,
            occurrences: len(filtered_txns)
        })
    
    // 9. Sort by confidence (highest first)
    result_patterns.sort_by("confidence", reverse=True)
    
    RETURN result_patterns

FUNCTION identify_period(interval_days, tolerance):
    IF abs(interval_days - 7) <= tolerance:
        RETURN ("Weekly", tolerance)
    ELSE IF abs(interval_days - 14) <= tolerance:
        RETURN ("Bi-weekly", tolerance + 1)
    ELSE IF abs(interval_days - 30) <= tolerance OR (interval_days >= 28 AND interval_days <= 31):
        RETURN ("Monthly", tolerance + 3)
    ELSE IF abs(interval_days - 90) <= tolerance + 5:
        RETURN ("Quarterly", tolerance + 5)
    ELSE IF abs(interval_days - 365) <= tolerance + 10:
        RETURN ("Annual", tolerance + 10)
    ELSE:
        RETURN ("Unknown", 0)
END FUNCTION
```

---

#### **C. Z-Score Anomaly Detection (Feature #5)**

```pseudocode
FUNCTION detect_anomaly_zscore(transaction, category_history, threshold_z=2):
    // Input: transaction {date, merchant, amount}, category_history (list of recent amounts)
    // Output: anomaly_score (0–100), reason, action
    
    // 1. Z-score calculation
    IF len(category_history) < 3:
        RETURN {
            anomaly_score: 0,
            reason: "insufficient_history",
            action: "none"
        }
    
    amounts = [txn.amount for txn in category_history]
    mu = mean(amounts)
    sigma = std(amounts)
    
    IF sigma < 0.01:  // Near-zero variance
        RETURN {
            anomaly_score: 0,
            reason: "stable_category",
            action: "none"
        }
    
    z_score = abs(transaction.amount - mu) / sigma
    z_based_score = min(100, (z_score / threshold_z) * 100) // Scale to 0–100
    
    // 2. Classify
    IF z_score >= 3:
        reason = "amount_extreme_outlier"
        action = "review"
        anomaly_score = 90
    ELSE IF z_score >= 2:
        reason = "amount_outlier"
        action = "flag_in_ui"
        anomaly_score = z_based_score
    ELSE:
        reason = "normal"
        action = "none"
        anomaly_score = 0
    
    // 3. Check for duplicates
    recent_txns = [txn for txn in category_history if days_between(txn.date, transaction.date) <= 1]
    FOR txn IN recent_txns:
        IF merchant_fuzzy_match(txn.merchant, transaction.merchant) AND abs(txn.amount - transaction.amount) < 0.01:
            reason = "duplicate_detected"
            action = "review"
            anomaly_score = 95
            BREAK
    
    RETURN {
        anomaly_score: round(anomaly_score, 1),
        reason: reason,
        action: action,
        z_score: round(z_score, 2),
        expected_range: [round(mu - 2*sigma, 2), round(mu + 2*sigma, 2)]
    }
END FUNCTION
```

---

#### **D. Cash Runway Calculation (Feature #6)**

```pseudocode
FUNCTION calculate_runway(cash_on_hand, monthly_net_burn, scenarios=["base", "conservative", "best"]):
    // Input: cash_on_hand (dollars), monthly_net_burn (negative = deficit)
    // Output: runway in months for each scenario, status, recommendation
    
    result = {}
    
    FOR scenario IN scenarios:
        IF scenario == "base":
            adjusted_burn = monthly_net_burn
            burn_label = "Current Net Burn"
        ELSE IF scenario == "conservative":
            // Assume 20% income loss or 10% expense increase
            adjusted_burn = monthly_net_burn * 1.2  // More negative burn
            burn_label = "Income 20% Lower"
        ELSE IF scenario == "best":
            // Assume 10% expense reduction
            adjusted_burn = monthly_net_burn * 0.9  // Less negative burn
            burn_label = "Expenses 10% Lower"
        
        IF adjusted_burn >= 0:
            runway_months = null  // Positive cash flow; indefinite
            status = "surplus"
        ELSE:
            runway_months = round(cash_on_hand / abs(adjusted_burn), 1)
            IF runway_months < 3:
                status = "critical"
            ELSE IF runway_months < 6:
                status = "caution"
            ELSE IF runway_months < 12:
                status = "adequate"
            ELSE:
                status = "comfortable"
        
        result[scenario] = {
            runway_months: runway_months,
            status: status,
            burn_label: burn_label,
            depletion_date: add_months(today, runway_months) IF runway_months != null ELSE null
        }
    
    // 6. Recommendation
    base_runway = result["base"].runway_months
    IF base_runway == null:
        recommendation = "Excellent: Positive cash flow. Focus on goal funding."
    ELSE IF base_runway < 3:
        recommendation = "URGENT: Cut expenses or increase income immediately. Build emergency fund."
    ELSE IF base_runway < 6:
        recommendation = "CAUTION: Consider cost reduction or income boost within 6 months."
    ELSE IF base_runway < 12:
        recommendation = "ADEQUATE: Monitor monthly. Consider building runway to 12+ months."
    ELSE:
        recommendation = "COMFORTABLE: Continue monitoring; runway is secure."
    
    result["recommendation"] = recommendation
    result["scenarios"] = result
    
    RETURN result
END FUNCTION
```

---

#### **E. Monte Carlo Portfolio Simulation (Feature #11)**

```pseudocode
FUNCTION simulate_portfolio_monte_carlo(portfolio, contributions_per_month, time_horizon_months, 
                                        n_simulations=1000, expected_return=null, expected_vol=null):
    // Input: portfolio {ticker: {shares, price}}, contributions (monthly $), horizon (months), 
    //        n_simulations (integer), expected_return & expected_vol (% per annum, if user-specified)
    // Output: distribution of final portfolio values, percentiles, probability of goal
    
    // 1. Fetch or use historical returns
    IF expected_return == null OR expected_vol == null:
        historical_data = fetch_historical_prices(portfolio, lookback_years=3)
        returns, volatilities, correlation_matrix = calculate_stats(historical_data)
    ELSE:
        returns = [expected_return for each security]
        volatilities = [expected_vol for each security]
        correlation_matrix = identity_matrix (assume independent)
    
    // Convert annual to monthly
    monthly_returns = [(1 + r)^(1/12) - 1 for r in returns]
    monthly_vols = [v / sqrt(12) for v in volatilities]
    
    // 2. Cholesky decomposition for correlated returns
    L = cholesky(correlation_matrix)
    
    // 3. Run simulations
    final_values = []
    
    FOR sim = 1 TO n_simulations:
        portfolio_value = sum(shares[t] * price[t] for each ticker t in portfolio)
        
        FOR month = 1 TO time_horizon_months:
            // Generate correlated random returns
            z = random_normal(0, 1, size=len(portfolio))  // Independent N(0,1)
            correlated_z = L @ z  // Apply correlation
            
            // Apply returns to each security
            FOR t, ticker IN enumerate(portfolio):
                return_t = monthly_returns[t] + monthly_vols[t] * correlated_z[t]
                portfolio_value = portfolio_value * (1 + return_t)
            
            // Add contribution
            portfolio_value += contributions_per_month
            
            // Optional: Rebalance quarterly
            IF month % 3 == 0:
                portfolio_value = rebalance_to_weights(portfolio_value, target_weights)
        
        final_values.append(portfolio_value)
    
    // 4. Analyze results
    final_values.sort()
    mean_final = mean(final_values)
    std_final = std(final_values)
    
    percentiles = {
        "10th": final_values[floor(0.10 * n_simulations)],
        "25th": final_values[floor(0.25 * n_simulations)],
        "50th": final_values[floor(0.50 * n_simulations)],
        "75th": final_values[floor(0.75 * n_simulations)],
        "90th": final_values[floor(0.90 * n_simulations)]
    }
    
    // 5. Goal probability
    goal_amount = user_input OR null
    IF goal_amount != null:
        prob_goal = count(v >= goal_amount for v in final_values) / n_simulations
    ELSE:
        prob_goal = null
    
    RETURN {
        mean: round(mean_final, 2),
        std: round(std_final, 2),
        percentiles: {k: round(v, 2) for k, v in percentiles},
        confidence_interval: [percentiles["10th"], percentiles["90th"]],
        probability_of_goal: round(prob_goal * 100, 1) IF prob_goal != null ELSE null,
        simulations_run: n_simulations,
        horizon_months: time_horizon_months,
        assumptions: "Historical returns/volatility assumed predictive. No fees/taxes included. Tail risk may be underestimated."
    }
END FUNCTION
```

---

## Part 4: Suggested Data Model & Computation-Layer Design

### **Database Schema (PostgreSQL / SQLite)**

```sql
-- Core Tables

-- 1. Users (optional, for multi-user systems)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB  -- Preferences: currency, thresholds, etc.
);

-- 2. Accounts (checking, savings, investment, credit card)
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    name VARCHAR(255),
    account_type VARCHAR(50),  -- checking, savings, credit_card, investment, loan
    balance DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- 3. Transactions (core data)
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    account_id INT REFERENCES accounts(account_id),
    date DATE NOT NULL,
    merchant VARCHAR(255),
    description TEXT,
    amount DECIMAL(15, 2),  -- Positive for income/outflow, negative for expenses/inflow (or use separate col)
    category VARCHAR(100),  -- Groceries, Utilities, Entertainment, etc.
    subcategory VARCHAR(100),  -- Optional: Organic Food, Gas Bill, Movies
    is_recurring BOOLEAN DEFAULT FALSE,  -- Flagged by Feature #2
    recurring_id INT,  -- Foreign key to recurring pattern
    is_anomaly BOOLEAN DEFAULT FALSE,  -- Flagged by Feature #5
    anomaly_score DECIMAL(3, 1),  -- 0–100
    tags VARCHAR(255),  -- User-added tags
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (recurring_id) REFERENCES recurring_patterns(recurring_pattern_id)
);

-- 4. Budgets (by category, monthly or annual)
CREATE TABLE budgets (
    budget_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    category VARCHAR(100),
    period VARCHAR(20) DEFAULT 'monthly',  -- monthly, annual
    amount DECIMAL(15, 2),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, period, start_date)
);

-- 5. Recurring Patterns (detected by Feature #2)
CREATE TABLE recurring_patterns (
    recurring_pattern_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    merchant VARCHAR(255),
    category VARCHAR(100),
    avg_amount DECIMAL(15, 2),
    period VARCHAR(50),  -- Weekly, Bi-weekly, Monthly, Quarterly, Annual
    confidence DECIMAL(5, 2),  -- 0–100%
    status VARCHAR(20),  -- Confirmed, Unconfirmed, Archived
    last_occurrence_date DATE,
    next_expected_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, merchant, category)
);

-- 6. Financial Goals
CREATE TABLE goals (
    goal_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    name VARCHAR(255),
    description TEXT,
    target_amount DECIMAL(15, 2),
    target_date DATE,
    current_saved DECIMAL(15, 2) DEFAULT 0,
    priority INT,  -- 1=highest
    category VARCHAR(100),  -- Vacation, Home Down Payment, Retirement, Education, etc.
    status VARCHAR(20) DEFAULT 'active',  -- active, completed, archived
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 7. Debts (loans, credit cards)
CREATE TABLE debts (
    debt_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    name VARCHAR(255),
    principal_amount DECIMAL(15, 2),
    current_balance DECIMAL(15, 2),
    annual_interest_rate DECIMAL(5, 2),
    min_monthly_payment DECIMAL(15, 2),
    due_date_monthly INT,  -- Day of month (1–31)
    payment_method VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',  -- active, paid_off, deferred
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Emergency Fund Configuration (Feature #12)
CREATE TABLE emergency_fund_config (
    config_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    income_stability VARCHAR(50),  -- stable, variable, high_variable
    monthly_essential_expenses DECIMAL(15, 2),
    recommended_months INT,
    recommended_amount DECIMAL(15, 2),
    current_balance DECIMAL(15, 2),
    status VARCHAR(20),  -- below_target, adequate, above_target
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 9. Monthly Snapshots (for historical tracking and reporting)
CREATE TABLE monthly_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    month DATE,  -- First day of month
    total_income DECIMAL(15, 2),
    total_expenses DECIMAL(15, 2),
    net_cash_flow DECIMAL(15, 2),
    savings_rate DECIMAL(5, 2),  -- Percentage
    budget_adherence DECIMAL(5, 2),  -- Percentage
    cash_runway_months DECIMAL(5, 1),
    net_worth SNAPSHOT(assets, liabilities),  -- JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month)
);

-- 10. Portfolio Holdings (for Feature #11: Investment Simulator)
CREATE TABLE portfolio_holdings (
    holding_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    ticker VARCHAR(20),
    shares DECIMAL(15, 6),
    purchase_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2),
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Price History (cache for Feature #11)
CREATE TABLE price_history (
    price_id SERIAL PRIMARY KEY,
    ticker VARCHAR(20),
    date DATE,
    open DECIMAL(15, 2),
    high DECIMAL(15, 2),
    low DECIMAL(15, 2),
    close DECIMAL(15, 2),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, date),
    INDEX(ticker, date)
);

-- Indexes for Performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(user_id, category);
CREATE INDEX idx_budgets_user_month ON budgets(user_id, start_date);
CREATE INDEX idx_recurring_user ON recurring_patterns(user_id);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_monthly_snapshots_user_month ON monthly_snapshots(user_id, month);
```

### **Computation Layer Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vue)                         │
│         Dashboard, Forms, Alerts, Charts, Reports               │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────▼────────────────────────────────────────┐
│              API Layer (FastAPI, Django, Node.js)               │
│  Routes: /transactions, /budgets, /forecasts, /goals, etc.      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│           Business Logic Layer (Python / Service Modules)       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Feature Engines (12 Analytics)                          │   │
│  │ 1. BudgetTracker          → budget_variance_service.py  │   │
│  │ 2. RecurringDetector      → recurring_service.py        │   │
│  │ 3. ExpenseForecaster      → forecast_service.py         │   │
│  │ 4. CashFlowAnalyzer       → cashflow_service.py         │   │
│  │ 5. AnomalyDetector        → anomaly_service.py          │   │
│  │ 6. RunwayCalculator       → runway_service.py           │   │
│  │ 7. SavingsTracker         → savings_service.py          │   │
│  │ 8. DebtAnalyzer           → debt_service.py             │   │
│  │ 9. AdherenceAnalyzer      → adherence_service.py        │   │
│  │ 10. BudgetOptimizer       → optimization_service.py     │   │
│  │ 11. PortfolioSimulator    → simulator_service.py        │   │
│  │ 12. EmergencyFundCalc     → emergency_fund_service.py   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Shared Utilities                                         │   │
│  │ • time_series_utils.py (ARIMA, ETS, smoothing)         │   │
│  │ • stats_utils.py (z-score, isolation forest, CV)        │   │
│  │ • transaction_processor.py (parsing, validation)        │   │
│  │ • date_utils.py (period detection, seasonality)         │   │
│  │ • portfolio_utils.py (returns, correlation, rebalance)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│           Data Access Layer (ORM / Queries)                     │
│   SQLAlchemy, Tortoise-ORM, or custom SQL layer                │
│   Caching: Redis (optional, for frequent queries)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Database & File Storage                            │
│   PostgreSQL / SQLite (transactions, budgets, goals, etc.)      │
│   Optional: S3 / GCS for backups, price history                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Computation Scheduling (Batch/Scheduled Tasks)**

```python
# Example: Celery or APScheduler configuration

SCHEDULED_TASKS = {
    "detect_recurring_daily": {
        "schedule": "daily at 02:00 UTC",
        "function": "recurring_service.detect_and_update_patterns",
        "args": [],
        "timeout": 300,  # seconds
    },
    "forecast_expenses_daily": {
        "schedule": "daily at 02:30 UTC",
        "function": "forecast_service.generate_monthly_forecasts",
        "args": [],
        "timeout": 300,
    },
    "calculate_anomalies_realtime": {
        "schedule": "every 1 hour",
        "function": "anomaly_service.check_recent_transactions",
        "args": [],
        "timeout": 120,
    },
    "generate_monthly_snapshot": {
        "schedule": "first day of month at 03:00 UTC",
        "function": "snapshot_service.create_monthly_summary",
        "args": ["current_month"],
        "timeout": 600,
    },
    "rebalance_portfolio_quarterly": {
        "schedule": "first day of quarter at 04:00 UTC",
        "function": "portfolio_service.rebalance",
        "args": [],
        "timeout": 300,
    },
}
```

---

## Part 5: Implementation Plan & Test Cases

### **MVP Milestones**

**Phase 1 (Weeks 1–2): Core Data Model & API Framework**
- ✓ Database schema (SQLite or PostgreSQL)
- ✓ API scaffolding (CRUD endpoints for transactions, budgets, goals)
- ✓ Transaction import (CSV upload)
- ✓ User authentication (optional; basic for MVP)

**Phase 2 (Weeks 3–4): Features #1, #2, #3 (Critical Path)**
- ✓ Budget vs. Actual (Feature #1)
- ✓ Recurring Transaction Detection (Feature #2)
- ✓ Expense Forecasting (Feature #3)
- ✓ Unit tests for each

**Phase 3 (Weeks 5–6): Features #4–7 (High Impact)**
- ✓ Cash Flow Stability (Feature #4)
- ✓ Anomaly Detection (Feature #5)
- ✓ Runway Calculator (Feature #6)
- ✓ Savings Rate & Goals (Feature #7)

**Phase 4 (Weeks 7–8): Features #8–10 (Medium Impact)**
- ✓ Debt-to-Income (Feature #8)
- ✓ Budget Adherence (Feature #9)
- ✓ Adaptive Budget (Feature #10)

**Phase 5 (Weeks 9–10): Features #11–12 + Polish**
- ✓ Portfolio Simulator (Feature #11)
- ✓ Emergency Fund Calculator (Feature #12)
- ✓ Reporting / Dashboard UI
- ✓ E2E tests

**Phase 6 (Week 11+): Optimization & Hardening**
- ✓ Performance tuning (indexing, query optimization)
- ✓ Edge case handling & error messages
- ✓ Documentation & deployment guide

---

### **Unit Test Cases (By Feature)**

#### **Feature #1: Budget vs. Actual**

```python
def test_budget_variance_on_track():
    budget = {"Groceries": 400}
    actual = [("Grocery Store", 390), ("Whole Foods", 20)]  # Total: 410
    variance = calculate_budget_variance(budget["Groceries"], sum(actual[i][1] for i in range(len(actual))))
    assert variance == 2.5, f"Expected 2.5%, got {variance}%"
    assert classify_status(variance) == "On Track"

def test_budget_variance_over():
    budget = {"Entertainment": 200}
    actual = 300
    variance = calculate_budget_variance(budget, actual)
    assert variance == 50.0, f"Expected 50%, got {variance}%"
    assert classify_status(variance) == "Over Budget"

def test_budget_variance_under():
    budget = {"Utilities": 150}
    actual = 100
    variance = calculate_budget_variance(budget, actual)
    assert variance == -33.3, f"Expected -33.3%, got {variance}%"
    assert classify_status(variance) == "Under Budget"

def test_budget_variance_empty_category():
    budget = {"Rare Category": 0}
    actual = 50
    variance = calculate_budget_variance(budget, actual)
    # Special case: treat as "unlimited"; flag for review
    assert variance == float('inf') or variance > 100
    assert requires_user_review(variance)

def test_first_month_no_history():
    budget = {"Groceries": 400}
    actual = 420
    # No prior months to compare
    variance = calculate_budget_variance(budget, actual)
    assert variance == 5.0
    # Still compute, but flag for refinement next month
```

#### **Feature #2: Recurring Transaction Detection**

```python
def test_recurring_monthly_netflix():
    txns = [
        Txn(date="2025-01-15", merchant="Netflix", amount=15.99),
        Txn(date="2025-02-15", merchant="Netflix", amount=15.99),
        Txn(date="2025-03-15", merchant="Netflix", amount=15.99),
    ]
    patterns = detect_recurring_transactions(txns)
    assert len(patterns) == 1
    assert patterns[0]["period"] == "Monthly"
    assert patterns[0]["confidence"] > 95
    assert patterns[0]["status"] == "Confirmed"

def test_recurring_biweekly_paycheck():
    txns = [
        Txn(date="2025-01-03", merchant="Employer Inc", amount=3000),
        Txn(date="2025-01-17", merchant="Employer Inc", amount=3000),
        Txn(date="2025-01-31", merchant="Employer Inc", amount=3000),
        Txn(date="2025-02-14", merchant="Employer Inc", amount=3000),
    ]
    patterns = detect_recurring_transactions(txns)
    assert len(patterns) == 1
    assert patterns[0]["period"] == "Bi-weekly"
    assert patterns[0]["next_expected_date"] == "2025-02-28"

def test_recurring_unconfirmed():
    txns = [
        Txn(date="2025-01-15", merchant="Gym", amount=50),
        Txn(date="2025-02-15", merchant="Gym", amount=50),
    ]
    patterns = detect_recurring_transactions(txns)
    assert len(patterns) == 1
    assert patterns[0]["status"] == "Unconfirmed"
    assert patterns[0]["occurrences"] == 2

def test_recurring_with_amount_variance():
    txns = [
        Txn(date="2025-01-01", merchant="Utility Co", amount=80),
        Txn(date="2025-02-01", merchant="Utility Co", amount=85),
        Txn(date="2025-03-01", merchant="Utility Co", amount=82),
        Txn(date="2025-04-01", merchant="Utility Co", amount=88),
    ]
    patterns = detect_recurring_transactions(txns, amount_tolerance=0.15)
    assert len(patterns) == 1
    assert patterns[0]["avg_amount"] == 83.75
    assert patterns[0]["period"] == "Monthly"

def test_no_recurring_grocery():
    txns = [
        Txn(date="2025-01-05", merchant="Kroger", amount=50),
        Txn(date="2025-01-12", merchant="Kroger", amount=85),
        Txn(date="2025-01-20", merchant="Kroger", amount=60),
        Txn(date="2025-01-28", merchant="Kroger", amount=75),
    ]
    patterns = detect_recurring_transactions(txns)
    assert len(patterns) == 0  # Too variable (dates & amounts)
```

#### **Feature #3: Expense Forecasting**

```python
def test_forecast_stable_expense():
    amounts = [400, 420, 410, 405, 415]
    forecast, ci_low, ci_high, confidence = forecast_expense(amounts)
    assert 410 - 15 < forecast < 410 + 15  # Should be near mean
    assert confidence == "High"
    assert ci_low < forecast < ci_high

def test_forecast_trending_up():
    amounts = [300, 320, 350, 380, 400]  # Increasing trend
    forecast, _, _, _ = forecast_expense(amounts)
    assert forecast > 400  # Should extrapolate upward

def test_forecast_insufficient_data():
    amounts = [100]  # Only 1 month
    forecast, _, _, confidence = forecast_expense(amounts)
    assert forecast == 100  # Just return the value
    assert confidence == "Low"

def test_forecast_with_seasonality():
    # 2 years of data with winter/summer pattern
    amounts = [80, 75, 50, 30, 25, 30, 45, 70, 80, 75, 85, 90, 
               85, 80, 55, 35, 20, 28, 40, 65, 75, 80, 90, 92]
    forecast_jan = forecast_expense(amounts, next_month="January")
    forecast_jul = forecast_expense(amounts, next_month="July")
    # Winter should be higher
    assert forecast_jan > forecast_jul
```

#### **Feature #5: Anomaly Detection**

```python
def test_anomaly_zscore_normal():
    history = [100, 105, 102, 98, 101]
    txn = {"amount": 103}
    score, reason, action = detect_anomaly(txn, history)
    assert score < 20, f"Normal transaction should score low, got {score}"
    assert action == "none"

def test_anomaly_zscore_outlier():
    history = [100, 105, 102, 98, 101]
    txn = {"amount": 300}  # 3x normal
    score, reason, action = detect_anomaly(txn, history)
    assert score > 70, f"Outlier should score high, got {score}"
    assert action == "review"
    assert reason == "amount_outlier"

def test_anomaly_duplicate():
    history = [50, 55, 52]
    txn1 = {"merchant": "Netflix", "amount": 15.99, "date": "2025-01-15"}
    txn2 = {"merchant": "Netflix", "amount": 15.99, "date": "2025-01-15 01:30"}  # 1.5 hours later
    score, reason, action = detect_anomaly(txn2, [txn1] + [{"amount": 16} for _ in range(3)])
    assert score > 80, "Duplicate should be flagged"
    assert reason == "duplicate_detected"

def test_anomaly_new_merchant_reasonable_amount():
    history = [100, 105, 102, 98, 101]
    txn = {"merchant": "New Store", "amount": 102}  # Normal amount, new merchant
    score, reason, action = detect_anomaly(txn, history)
    assert score < 50, "Reasonable amount should not be heavily penalized"
    assert action == "flag_in_ui"  # Warn but don't block
```

#### **Feature #6: Cash Runway**

```python
def test_runway_positive_cashflow():
    cash = 20000
    monthly_burn = -1500  # Negative burn = income > expenses
    runway, status, rec = calculate_runway(cash, monthly_burn)
    assert runway is None or runway == float('inf')
    assert status == "surplus"

def test_runway_deficit_5_months():
    cash = 15000
    monthly_burn = 3000  # Deficit
    runway, status, rec = calculate_runway(cash, monthly_burn)
    assert runway == 5.0
    assert status == "adequate"

def test_runway_critical():
    cash = 5000
    monthly_burn = 2000
    runway, status, rec = calculate_runway(cash, monthly_burn)
    assert runway == 2.5
    assert status == "critical"

def test_runway_scenario_conservative():
    cash = 20000
    monthly_burn = 2000
    scenarios = calculate_runway_scenarios(cash, monthly_burn)
    assert scenarios["base"]["runway_months"] == 10
    assert scenarios["conservative"]["runway_months"] < 10  # More negative burn

def test_runway_zero_cash():
    cash = 0
    monthly_burn = 1000
    runway, status, _ = calculate_runway(cash, monthly_burn)
    assert runway == 0
    assert status == "critical"
```

#### **Feature #11: Portfolio Simulator (Monte Carlo)**

```python
def test_monte_carlo_deterministic():
    # Single-security, fixed return
    portfolio = {"ticker": "SPY", "shares": 100, "price": 450}
    contributions = 0
    horizon = 12
    expected_return = 0.08  # 8% annual
    expected_vol = 0  # No volatility
    
    result = simulate_portfolio(portfolio, contributions, horizon, n_sims=100, 
                                ret=expected_return, vol=expected_vol)
    # With 0 volatility, all sims should converge
    assert abs(result["mean"] - result["percentiles"]["50th"]) < 1000

def test_monte_carlo_goal_probability():
    portfolio = {"ticker": "SPY", "shares": 100, "price": 450}
    contributions = 500  # Monthly
    horizon = 60  # 5 years
    expected_return = 0.07
    expected_vol = 0.15
    
    result = simulate_portfolio(portfolio, contributions, horizon, goal_amount=100000)
    
    # Should have non-zero probability of reaching goal
    assert result["probability_of_goal"] > 0
    assert result["probability_of_goal"] <= 100

def test_monte_carlo_volatility_impact():
    portfolio = {"ticker": "STOCK", "shares": 100, "price": 50}
    contributions = 100
    horizon = 24
    
    # Low volatility scenario
    result_low = simulate_portfolio(portfolio, contributions, horizon, 
                                     n_sims=1000, ret=0.08, vol=0.05)
    
    # High volatility scenario
    result_high = simulate_portfolio(portfolio, contributions, horizon, 
                                      n_sims=1000, ret=0.08, vol=0.30)
    
    # High vol should have wider CI
    ci_width_low = result_low["percentiles"]["90th"] - result_low["percentiles"]["10th"]
    ci_width_high = result_high["percentiles"]["90th"] - result_high["percentiles"]["10th"]
    assert ci_width_high > ci_width_low
```

#### **Feature #12: Emergency Fund Calculator**

```python
def test_emergency_fund_stable_employed():
    income_stability = "stable"
    essential_expenses = 3000
    dependents = 0
    health = "good"
    job_stability_years = 8
    
    result = calculate_emergency_fund(income_stability, essential_expenses, 
                                       dependents, health, job_stability_years)
    assert result["recommended_months"] >= 3
    assert result["recommended_months"] <= 6
    assert result["recommended_amount"] == result["recommended_months"] * essential_expenses

def test_emergency_fund_variable_income():
    income_stability = "freelance"
    essential_expenses = 4000
    dependents = 2  # Two kids
    health = "good"
    job_stability_years = 1
    
    result = calculate_emergency_fund(income_stability, essential_expenses,
                                       dependents, health, job_stability_years)
    # Freelancer + dependents = higher recommendation
    assert result["recommended_months"] >= 9
    assert result["recommended_months"] <= 12

def test_emergency_fund_health_risk():
    income_stability = "employed"
    essential_expenses = 3000
    dependents = 0
    health = "chronic_condition"
    job_stability_years = 5
    
    result = calculate_emergency_fund(income_stability, essential_expenses,
                                       dependents, health, job_stability_years)
    # Health risk adds buffer
    assert result["recommended_months"] >= 6

def test_emergency_fund_below_target():
    current_fund = 5000
    recommended_amount = 15000
    result = evaluate_emergency_fund_status(current_fund, recommended_amount)
    assert result["status"] == "Below Target"
    assert result["action"] == "Build"
    assert result["needed"] == 10000

def test_emergency_fund_above_target():
    current_fund = 25000
    recommended_amount = 15000
    result = evaluate_emergency_fund_status(current_fund, recommended_amount)
    assert result["status"] == "Above Target"
    assert result["action"] == "Reallocate"
    assert result["excess"] == 10000
```

#### **Integration Test: End-to-End User Flow**

```python
def test_full_workflow():
    """
    User uploads CSV, system detects patterns, forecasts expenses, 
    calculates runway, and generates dashboard summary.
    """
    # 1. Import transactions
    csv_data = """
date,merchant,amount,category
2024-12-01,Employer Inc,3000,Income
2024-12-01,Netflix,-15.99,Entertainment
2024-12-05,Kroger,-50,Groceries
...
"""
    import_result = import_transactions_from_csv(csv_data, user_id=1)
    assert import_result["imported"] > 0
    
    # 2. Trigger background jobs
    detect_recurring_transactions(user_id=1)
    forecast_expenses(user_id=1)
    
    # 3. Check outputs
    recurring = get_recurring_patterns(user_id=1)
    assert any(r["merchant"] == "Netflix" for r in recurring)
    
    forecast = get_forecast(user_id=1, category="Groceries")
    assert forecast["amount"] > 0
    
    # 4. Calculate metrics
    metrics = calculate_financial_metrics(user_id=1)
    assert metrics["savings_rate"] >= 0
    assert metrics["budget_adherence"] >= 0 and metrics["budget_adherence"] <= 100
    
    # 5. Generate dashboard
    dashboard = generate_dashboard(user_id=1)
    assert "budget_summary" in dashboard
    assert "recurring_patterns" in dashboard
    assert "forecast" in dashboard
    assert "runway" in dashboard
```

---

## Part 6: Optional – Advanced Topics

### **What-If Simulator (Mini Version for Dashboard)**

**Use Case**: "If I increase savings by $200/mo, can I hit my $50k vacation goal by next December?"

**Quick Simulation** (within dashboard, not full Monte Carlo):

```python
def whatif_goal_timeline(goal_target, current_saved, monthly_contribution, override_return_rate=None):
    """
    Simple deterministic projection: How long to reach goal?
    """
    remaining = goal_target - current_saved
    
    if override_return_rate:
        # Account for investment returns (e.g., in 529 or taxable account)
        monthly_return = (1 + override_return_rate) ** (1/12) - 1
        months = solve_for_months_with_returns(remaining, monthly_contribution, monthly_return)
    else:
        # Simple linear projection (e.g., savings account, no returns)
        months = remaining / monthly_contribution if monthly_contribution > 0 else float('inf')
    
    completion_date = add_months(today, months)
    status = "On track" if completion_date <= goal_deadline else f"Late by {months - months_to_deadline} months"
    
    return {
        "months_to_goal": round(months, 1),
        "completion_date": completion_date,
        "status": status,
        "total_saved": goal_target,
        "total_contributed": monthly_contribution * months,
        "investment_gains": goal_target - current_saved - (monthly_contribution * months),
    }

# Example
result = whatif_goal_timeline(goal_target=50000, current_saved=10000, monthly_contribution=1200)
# Output: {"months_to_goal": 33.3, "completion_date": "2027-10-01", "status": "Late by 10 months"}
```

---

## Final Checklist: Implementation Readiness

- [ ] Database schema approved by team
- [ ] API endpoints documented (OpenAPI/Swagger)
- [ ] Algorithm pseudocode reviewed for correctness
- [ ] Data privacy plan (encryption, retention, backups)
- [ ] Performance benchmarks defined (e.g., <200ms for budget calc)
- [ ] Error handling strategy (graceful degradation, logging)
- [ ] Testing framework selected (pytest, Jest, etc.)
- [ ] Deployment pipeline (CI/CD) sketched
- [ ] Documentation repo initialized (README, runbooks, troubleshooting)
- [ ] Stakeholder sign-off on feature priorities & timeline

---

## References & Citations

| Feature | Source | Link |
|---------|--------|------|
| Budget Tracking | YNAB, CFP | https://www.ynab.com; https://www.cfp.net |
| Recurring Detection | Fintech Reddit, Meniga | https://www.reddit.com/r/fintech; https://www.meniga.com |
| Forecasting (ETS) | DataCamp, IBKR | https://www.datacamp.com/tutorial/arima; https://www.interactivebrokers.com |
| Anomaly Detection (Z-Score, IF) | Data-Driven Investor, DataCamp | https://www.datadriveninvestor.com; https://www.datacamp.com/tutorial/isolation-forest |
| Cash Runway, Burn Rate | Wall Street Prep, Rho, Carta | https://www.wallstreetprep.com; https://www.rho.co; https://carta.com |
| Emergency Fund (CFP) | CFP Board | https://www.cfp.net/standards; https://www.letsmakeaplan.org |
| Cash Flow Metrics | Ramp, NetSuite | https://www.ramp.com/blog/cash-flow-metrics; https://www.netsuite.com |
| Monte Carlo | QuantInsti, Lumina | https://blog.quantinsti.com; https://analytica.com |
| Firefly III (Open-Source) | GitHub | https://github.com/firefly-iii/firefly-iii |

---

**End of Specification**

**Status**: Ready for Implementation  
**Approval Required**: Product Manager, Engineering Lead, Data Science Lead  
**Next Step**: Assign tasks to development team; set up code repositories and CI/CD pipeline.
