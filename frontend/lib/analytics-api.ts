/**
 * Analytics API client for fetching comprehensive financial metrics
 */

import { getApiUrl } from './config'
import type {
  SavingsAnalysis,
  RecurringAnalysis,
  ExpenseForecast,
  CashFlowStability,
  AnomalyAnalysis,
  RunwayAnalysis,
  AdherenceAnalysis,
  AdaptiveBudgetAnalysis,
  DebtAnalysis,
  GoalsAnalysis,
  EmergencyFundAnalysis,
  SimulationResult,
  ScenarioComparison,
} from '@/types/analytics'

const apiUrl = getApiUrl()

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }
  
  return response.json()
}

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

export async function fetchForecast(category?: string, horizon = 1): Promise<ExpenseForecast> {
  const params = new URLSearchParams({ horizon: String(horizon) })
  if (category) params.set('category', category)
  return fetchApi(`/api/analytics/forecast?${params}`)
}

export async function fetchRecurring(): Promise<RecurringAnalysis> {
  return fetchApi('/api/analytics/recurring')
}

export async function fetchStability(months = 12): Promise<CashFlowStability> {
  return fetchApi(`/api/analytics/stability?months=${months}`)
}

export async function fetchRunway(cashOnHand: number, months = 6): Promise<RunwayAnalysis> {
  return fetchApi(`/api/analytics/runway?cash=${cashOnHand}&months=${months}`)
}

export async function fetchAnomalies(days = 30): Promise<AnomalyAnalysis> {
  return fetchApi(`/api/analytics/anomalies?days=${days}`)
}

export async function fetchAdherence(months = 6): Promise<AdherenceAnalysis> {
  return fetchApi(`/api/analytics/adherence?months=${months}`)
}

export async function fetchRecommendations(targetSavings?: number): Promise<AdaptiveBudgetAnalysis> {
  const params = targetSavings ? `?savings=${targetSavings}` : ''
  return fetchApi(`/api/analytics/recommendations${params}`)
}

export async function runSimulation(params: {
  initialValue: number
  monthlyContribution: number
  horizonMonths: number
  goalAmount?: number
}): Promise<SimulationResult> {
  return fetchApi('/api/analytics/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function compareInvestmentScenarios(params: {
  initialValue: number
  monthlyContribution: number
  horizonMonths: number
  goalAmount?: number
}): Promise<ScenarioComparison> {
  return fetchApi('/api/analytics/simulate/compare', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function calculateEmergencyFund(params: {
  incomeStability?: string
  monthlyEssentialExpenses?: number
  dependents?: number
  healthRisk?: string
  jobStabilityYears?: number
  hasPartnerIncome?: boolean
  currentBalance?: number
}): Promise<EmergencyFundAnalysis> {
  return fetchApi('/api/analytics/emergency-fund', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function quickEmergencyAssessment(
  currentSavings: number,
  hasVariableIncome: boolean
): Promise<EmergencyFundAnalysis & { estimatedMonthlyExpenses: number }> {
  return fetchApi(
    `/api/analytics/emergency-fund/quick?savings=${currentSavings}&variable=${hasVariableIncome}`
  )
}

// ============================================================================
// CRUD ENDPOINTS FOR BUDGETS, GOALS, DEBTS
// ============================================================================

// Budgets
export async function fetchBudgets() {
  return fetchApi<Array<{ id: number; category: string; amount: number; period: string }>>('/api/budgets')
}

export async function createBudget(data: { category: string; amount: number; period?: string }) {
  return fetchApi('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBudget(id: number, data: { amount?: number; period?: string }) {
  return fetchApi(`/api/budgets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteBudget(id: number) {
  return fetchApi(`/api/budgets/${id}`, { method: 'DELETE' })
}

// Goals
export async function fetchGoals() {
  return fetchApi<Array<{
    id: number
    name: string
    targetAmount: number
    currentSaved: number
    targetDate: string
    priority: number
    status: string
  }>>('/api/goals')
}

export async function createGoal(data: {
  name: string
  targetAmount: number
  targetDate: string
  priority?: number
  category?: string
}) {
  return fetchApi('/api/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGoal(id: number, data: Partial<{
  name: string
  targetAmount: number
  currentSaved: number
  targetDate: string
  priority: number
  status: string
}>) {
  return fetchApi(`/api/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteGoal(id: number) {
  return fetchApi(`/api/goals/${id}`, { method: 'DELETE' })
}

// Debts
export async function fetchDebts() {
  return fetchApi<Array<{
    id: number
    name: string
    principalAmount: number
    currentBalance: number
    annualInterestRate: number
    minMonthlyPayment: number
    dueDayOfMonth: number
    status: string
  }>>('/api/debts')
}

export async function createDebt(data: {
  name: string
  principalAmount: number
  currentBalance: number
  annualInterestRate: number
  minMonthlyPayment: number
  dueDayOfMonth: number
}) {
  return fetchApi('/api/debts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDebt(id: number, data: Partial<{
  name: string
  currentBalance: number
  annualInterestRate: number
  minMonthlyPayment: number
  status: string
}>) {
  return fetchApi(`/api/debts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteDebt(id: number) {
  return fetchApi(`/api/debts/${id}`, { method: 'DELETE' })
}

export async function analyzeDebts(extraPayment = 0): Promise<DebtAnalysis> {
  return fetchApi(`/api/debts/analyze?extra=${extraPayment}`)
}
