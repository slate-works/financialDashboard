/**
 * Test Fixture Data for Financial Analytics Engine
 * 
 * Contains realistic transaction data covering various edge cases:
 * - Multiple months of data
 * - Income and expense transactions
 * - Recurring patterns (Netflix, Salary, Rent)
 * - Anomalies (large purchases, duplicates)
 * - Various categories
 * - Refunds (negative expenses)
 * - Transfers
 */

export interface TestTransaction {
  id: number
  date: Date
  description: string
  category: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  account?: string
  note?: string
}

/**
 * Generate a date relative to today for testing
 */
export function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(12, 0, 0, 0) // Normalize to noon
  return date
}

/**
 * Generate a specific date in a month
 */
export function monthDate(monthsAgo: number, day: number): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - monthsAgo)
  date.setDate(day)
  date.setHours(12, 0, 0, 0)
  return date
}

/**
 * 6 months of realistic transaction data
 */
export const sampleTransactions: TestTransaction[] = [
  // =====================
  // MONTH 0 (Current Month)
  // =====================
  // Income
  { id: 1, date: monthDate(0, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  
  // Fixed expenses
  { id: 2, date: monthDate(0, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 3, date: monthDate(0, 5), description: 'Electric Company', category: 'Utilities', amount: -120, type: 'expense' },
  { id: 4, date: monthDate(0, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 5, date: monthDate(0, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 6, date: monthDate(0, 3), description: 'Kroger', category: 'Groceries', amount: -85.50, type: 'expense' },
  { id: 7, date: monthDate(0, 10), description: 'Whole Foods', category: 'Groceries', amount: -120.30, type: 'expense' },
  { id: 8, date: monthDate(0, 17), description: 'Trader Joes', category: 'Groceries', amount: -95.20, type: 'expense' },
  { id: 9, date: monthDate(0, 8), description: 'Shell Gas', category: 'Transportation', amount: -45.00, type: 'expense' },
  { id: 10, date: monthDate(0, 12), description: 'Movie Theater', category: 'Entertainment', amount: -32.00, type: 'expense' },
  
  // =====================
  // MONTH 1 (Last Month)
  // =====================
  // Income
  { id: 11, date: monthDate(1, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  { id: 12, date: monthDate(1, 15), description: 'Freelance Project', category: 'Freelance', amount: 800, type: 'income' },
  
  // Fixed expenses
  { id: 13, date: monthDate(1, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 14, date: monthDate(1, 5), description: 'Electric Company', category: 'Utilities', amount: -135, type: 'expense' },
  { id: 15, date: monthDate(1, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 16, date: monthDate(1, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 17, date: monthDate(1, 2), description: 'Kroger', category: 'Groceries', amount: -92.30, type: 'expense' },
  { id: 18, date: monthDate(1, 9), description: 'Whole Foods', category: 'Groceries', amount: -110.50, type: 'expense' },
  { id: 19, date: monthDate(1, 16), description: 'Kroger', category: 'Groceries', amount: -88.75, type: 'expense' },
  { id: 20, date: monthDate(1, 23), description: 'Trader Joes', category: 'Groceries', amount: -105.00, type: 'expense' },
  { id: 21, date: monthDate(1, 7), description: 'Shell Gas', category: 'Transportation', amount: -48.50, type: 'expense' },
  { id: 22, date: monthDate(1, 21), description: 'Chevron', category: 'Transportation', amount: -42.00, type: 'expense' },
  { id: 23, date: monthDate(1, 14), description: 'Restaurant', category: 'Dining', amount: -65.00, type: 'expense' },
  { id: 24, date: monthDate(1, 20), description: 'Coffee Shop', category: 'Dining', amount: -15.50, type: 'expense' },
  
  // Anomaly: Large purchase
  { id: 25, date: monthDate(1, 18), description: 'Best Buy - TV', category: 'Shopping', amount: -850, type: 'expense' },
  
  // =====================
  // MONTH 2
  // =====================
  // Income
  { id: 26, date: monthDate(2, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  
  // Fixed expenses
  { id: 27, date: monthDate(2, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 28, date: monthDate(2, 5), description: 'Electric Company', category: 'Utilities', amount: -95, type: 'expense' },
  { id: 29, date: monthDate(2, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 30, date: monthDate(2, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 31, date: monthDate(2, 4), description: 'Kroger', category: 'Groceries', amount: -78.90, type: 'expense' },
  { id: 32, date: monthDate(2, 11), description: 'Kroger', category: 'Groceries', amount: -95.60, type: 'expense' },
  { id: 33, date: monthDate(2, 18), description: 'Whole Foods', category: 'Groceries', amount: -130.20, type: 'expense' },
  { id: 34, date: monthDate(2, 6), description: 'Shell Gas', category: 'Transportation', amount: -52.00, type: 'expense' },
  { id: 35, date: monthDate(2, 20), description: 'Shell Gas', category: 'Transportation', amount: -47.50, type: 'expense' },
  { id: 36, date: monthDate(2, 12), description: 'Restaurant', category: 'Dining', amount: -48.00, type: 'expense' },
  
  // =====================
  // MONTH 3
  // =====================
  // Income
  { id: 37, date: monthDate(3, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  { id: 38, date: monthDate(3, 20), description: 'Freelance Project', category: 'Freelance', amount: 500, type: 'income' },
  
  // Fixed expenses
  { id: 39, date: monthDate(3, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 40, date: monthDate(3, 5), description: 'Electric Company', category: 'Utilities', amount: -88, type: 'expense' },
  { id: 41, date: monthDate(3, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 42, date: monthDate(3, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 43, date: monthDate(3, 3), description: 'Kroger', category: 'Groceries', amount: -88.40, type: 'expense' },
  { id: 44, date: monthDate(3, 10), description: 'Kroger', category: 'Groceries', amount: -102.30, type: 'expense' },
  { id: 45, date: monthDate(3, 17), description: 'Trader Joes', category: 'Groceries', amount: -85.50, type: 'expense' },
  { id: 46, date: monthDate(3, 8), description: 'Shell Gas', category: 'Transportation', amount: -44.00, type: 'expense' },
  { id: 47, date: monthDate(3, 22), description: 'Shell Gas', category: 'Transportation', amount: -50.00, type: 'expense' },
  { id: 48, date: monthDate(3, 15), description: 'Restaurant', category: 'Dining', amount: -72.00, type: 'expense' },
  { id: 49, date: monthDate(3, 25), description: 'Bar', category: 'Entertainment', amount: -55.00, type: 'expense' },
  
  // =====================
  // MONTH 4
  // =====================
  // Income
  { id: 50, date: monthDate(4, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  
  // Fixed expenses
  { id: 51, date: monthDate(4, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 52, date: monthDate(4, 5), description: 'Electric Company', category: 'Utilities', amount: -110, type: 'expense' },
  { id: 53, date: monthDate(4, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 54, date: monthDate(4, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 55, date: monthDate(4, 2), description: 'Kroger', category: 'Groceries', amount: -95.20, type: 'expense' },
  { id: 56, date: monthDate(4, 9), description: 'Whole Foods', category: 'Groceries', amount: -115.80, type: 'expense' },
  { id: 57, date: monthDate(4, 16), description: 'Kroger', category: 'Groceries', amount: -82.50, type: 'expense' },
  { id: 58, date: monthDate(4, 23), description: 'Trader Joes', category: 'Groceries', amount: -98.30, type: 'expense' },
  { id: 59, date: monthDate(4, 5), description: 'Shell Gas', category: 'Transportation', amount: -46.00, type: 'expense' },
  { id: 60, date: monthDate(4, 19), description: 'Chevron', category: 'Transportation', amount: -51.00, type: 'expense' },
  { id: 61, date: monthDate(4, 14), description: 'Restaurant', category: 'Dining', amount: -58.00, type: 'expense' },
  
  // Refund (negative expense = money back)
  { id: 62, date: monthDate(4, 20), description: 'Amazon Refund', category: 'Shopping', amount: 45.00, type: 'expense' },
  
  // =====================
  // MONTH 5
  // =====================
  // Income
  { id: 63, date: monthDate(5, 1), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' },
  { id: 64, date: monthDate(5, 15), description: 'Employer Inc - Salary', category: 'Salary', amount: 5000, type: 'income' }, // Bi-weekly scenario
  
  // Fixed expenses
  { id: 65, date: monthDate(5, 1), description: 'Rent Payment', category: 'Rent', amount: -1500, type: 'expense' },
  { id: 66, date: monthDate(5, 5), description: 'Electric Company', category: 'Utilities', amount: -78, type: 'expense' },
  { id: 67, date: monthDate(5, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 68, date: monthDate(5, 10), description: 'Spotify', category: 'Subscriptions', amount: -9.99, type: 'expense' },
  
  // Variable expenses
  { id: 69, date: monthDate(5, 3), description: 'Kroger', category: 'Groceries', amount: -91.00, type: 'expense' },
  { id: 70, date: monthDate(5, 10), description: 'Kroger', category: 'Groceries', amount: -87.50, type: 'expense' },
  { id: 71, date: monthDate(5, 17), description: 'Whole Foods', category: 'Groceries', amount: -125.00, type: 'expense' },
  { id: 72, date: monthDate(5, 24), description: 'Trader Joes', category: 'Groceries', amount: -92.80, type: 'expense' },
  { id: 73, date: monthDate(5, 7), description: 'Shell Gas', category: 'Transportation', amount: -49.00, type: 'expense' },
  { id: 74, date: monthDate(5, 21), description: 'Shell Gas', category: 'Transportation', amount: -53.00, type: 'expense' },
  { id: 75, date: monthDate(5, 12), description: 'Restaurant', category: 'Dining', amount: -45.00, type: 'expense' },
  { id: 76, date: monthDate(5, 26), description: 'Coffee Shop', category: 'Dining', amount: -12.50, type: 'expense' },
  
  // Transfer (should be excluded from income/expense totals)
  { id: 77, date: monthDate(5, 15), description: 'Transfer to Savings', category: 'Transfer', amount: -500, type: 'transfer' },
]

/**
 * Subset for testing insufficient data scenarios (only 1 month)
 */
export const insufficientDataTransactions: TestTransaction[] = sampleTransactions.filter(
  t => t.date >= monthDate(0, 1)
)

/**
 * Transactions specifically for testing recurring detection
 */
export const recurringTestTransactions: TestTransaction[] = [
  // Netflix - Monthly on 15th (6 occurrences, should be detected)
  { id: 100, date: monthDate(0, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 101, date: monthDate(1, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 102, date: monthDate(2, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 103, date: monthDate(3, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 104, date: monthDate(4, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 105, date: monthDate(5, 15), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  
  // Salary - Monthly on 1st (6 occurrences)
  { id: 110, date: monthDate(0, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  { id: 111, date: monthDate(1, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  { id: 112, date: monthDate(2, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  { id: 113, date: monthDate(3, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  { id: 114, date: monthDate(4, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  { id: 115, date: monthDate(5, 1), description: 'Employer Inc', category: 'Salary', amount: 5000, type: 'income' },
  
  // Variable utility bill (amount varies ±15%)
  { id: 120, date: monthDate(0, 5), description: 'Electric Company', category: 'Utilities', amount: -120, type: 'expense' },
  { id: 121, date: monthDate(1, 5), description: 'Electric Company', category: 'Utilities', amount: -135, type: 'expense' },
  { id: 122, date: monthDate(2, 5), description: 'Electric Company', category: 'Utilities', amount: -95, type: 'expense' },
  { id: 123, date: monthDate(3, 5), description: 'Electric Company', category: 'Utilities', amount: -88, type: 'expense' },
  { id: 124, date: monthDate(4, 5), description: 'Electric Company', category: 'Utilities', amount: -110, type: 'expense' },
  { id: 125, date: monthDate(5, 5), description: 'Electric Company', category: 'Utilities', amount: -78, type: 'expense' },
  
  // Gym - only 2 occurrences (should be "Unconfirmed")
  { id: 130, date: monthDate(0, 1), description: 'Planet Fitness', category: 'Health', amount: -25, type: 'expense' },
  { id: 131, date: monthDate(1, 1), description: 'Planet Fitness', category: 'Health', amount: -25, type: 'expense' },
  
  // Grocery - highly variable, not recurring pattern
  { id: 140, date: monthDate(0, 3), description: 'Kroger', category: 'Groceries', amount: -85.50, type: 'expense' },
  { id: 141, date: monthDate(0, 10), description: 'Kroger', category: 'Groceries', amount: -120.30, type: 'expense' },
  { id: 142, date: monthDate(0, 17), description: 'Kroger', category: 'Groceries', amount: -55.20, type: 'expense' },
  { id: 143, date: monthDate(0, 25), description: 'Kroger', category: 'Groceries', amount: -92.00, type: 'expense' },
  { id: 144, date: monthDate(1, 5), description: 'Kroger', category: 'Groceries', amount: -78.30, type: 'expense' },
]

/**
 * Transactions for anomaly detection testing
 */
export const anomalyTestTransactions: TestTransaction[] = [
  // Normal grocery purchases (establishing baseline)
  { id: 200, date: daysAgo(90), description: 'Kroger', category: 'Groceries', amount: -85, type: 'expense' },
  { id: 201, date: daysAgo(83), description: 'Kroger', category: 'Groceries', amount: -92, type: 'expense' },
  { id: 202, date: daysAgo(76), description: 'Kroger', category: 'Groceries', amount: -78, type: 'expense' },
  { id: 203, date: daysAgo(69), description: 'Kroger', category: 'Groceries', amount: -88, type: 'expense' },
  { id: 204, date: daysAgo(62), description: 'Kroger', category: 'Groceries', amount: -95, type: 'expense' },
  { id: 205, date: daysAgo(55), description: 'Kroger', category: 'Groceries', amount: -82, type: 'expense' },
  { id: 206, date: daysAgo(48), description: 'Kroger', category: 'Groceries', amount: -90, type: 'expense' },
  { id: 207, date: daysAgo(41), description: 'Kroger', category: 'Groceries', amount: -87, type: 'expense' },
  { id: 208, date: daysAgo(34), description: 'Kroger', category: 'Groceries', amount: -91, type: 'expense' },
  { id: 209, date: daysAgo(27), description: 'Kroger', category: 'Groceries', amount: -84, type: 'expense' },
  
  // ANOMALY: Large grocery purchase (z-score > 3)
  { id: 210, date: daysAgo(5), description: 'Kroger', category: 'Groceries', amount: -450, type: 'expense' },
  
  // Potential duplicate (same merchant, amount, within 1 hour conceptually)
  { id: 211, date: daysAgo(2), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
  { id: 212, date: daysAgo(2), description: 'Netflix', category: 'Subscriptions', amount: -15.99, type: 'expense' },
]

/**
 * Budget test data
 */
export const sampleBudgets = [
  { category: 'Groceries', amount: 400, period: 'monthly' as const },
  { category: 'Dining', amount: 150, period: 'monthly' as const },
  { category: 'Entertainment', amount: 100, period: 'monthly' as const },
  { category: 'Transportation', amount: 200, period: 'monthly' as const },
  { category: 'Utilities', amount: 150, period: 'monthly' as const },
  { category: 'Subscriptions', amount: 50, period: 'monthly' as const },
  { category: 'Shopping', amount: 200, period: 'monthly' as const },
]

/**
 * Sample goals for testing
 */
export const sampleGoals = [
  {
    name: 'Vacation Fund',
    targetAmount: 5000,
    currentSaved: 1500,
    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    priority: 1,
  },
  {
    name: 'Emergency Fund',
    targetAmount: 15000,
    currentSaved: 8000,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    priority: 2,
  },
  {
    name: 'New Car Down Payment',
    targetAmount: 10000,
    currentSaved: 2000,
    targetDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 2 years from now
    priority: 3,
  },
]

/**
 * Sample debts for testing
 */
export const sampleDebts = [
  {
    name: 'Credit Card',
    principalAmount: 5000,
    currentBalance: 4200,
    annualInterestRate: 18.99,
    minMonthlyPayment: 100,
    dueDayOfMonth: 15,
  },
  {
    name: 'Car Loan',
    principalAmount: 25000,
    currentBalance: 18000,
    annualInterestRate: 5.5,
    minMonthlyPayment: 450,
    dueDayOfMonth: 1,
  },
  {
    name: 'Student Loan',
    principalAmount: 35000,
    currentBalance: 28000,
    annualInterestRate: 4.5,
    minMonthlyPayment: 350,
    dueDayOfMonth: 20,
  },
]

/**
 * Helper to calculate monthly aggregates from transactions
 */
export function aggregateByMonth(transactions: TestTransaction[]): Map<string, { income: number; expenses: number; net: number }> {
  const monthly = new Map<string, { income: number; expenses: number; net: number }>()
  
  for (const t of transactions) {
    if (t.type === 'transfer') continue
    
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthly.has(monthKey)) {
      monthly.set(monthKey, { income: 0, expenses: 0, net: 0 })
    }
    
    const bucket = monthly.get(monthKey)!
    if (t.type === 'income') {
      bucket.income += Math.abs(t.amount)
    } else if (t.type === 'expense') {
      bucket.expenses += Math.abs(t.amount)
    }
    bucket.net = bucket.income - bucket.expenses
  }
  
  return monthly
}

/**
 * Helper to get transactions for a specific category
 */
export function getTransactionsByCategory(transactions: TestTransaction[], category: string): TestTransaction[] {
  return transactions.filter(t => t.category === category)
}

/**
 * Helper to get monthly amounts for a category
 */
export function getMonthlyAmountsForCategory(transactions: TestTransaction[], category: string): number[] {
  const monthly = new Map<string, number>()
  
  for (const t of transactions) {
    if (t.category !== category) continue
    
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    const current = monthly.get(monthKey) || 0
    monthly.set(monthKey, current + Math.abs(t.amount))
  }
  
  // Return sorted by month
  return Array.from(monthly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, amount]) => amount)
}
