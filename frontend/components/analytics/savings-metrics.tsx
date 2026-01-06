"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  PiggyBank,
  DollarSign,
  Activity,
  Target,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts"
import { useData } from "@/lib/data-context"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const formatPercent = (value: number) => `${value.toFixed(1)}%`

const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (trend === "decreasing") return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

const getSavingsRateColor = (rate: number) => {
  if (rate >= 20) return "text-emerald-500"
  if (rate >= 10) return "text-blue-500"
  if (rate >= 0) return "text-amber-500"
  return "text-red-500"
}

const getSavingsRateBadge = (rate: number) => {
  if (rate >= 20) return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Excellent</Badge>
  if (rate >= 10) return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Good</Badge>
  if (rate >= 0) return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Needs Work</Badge>
  return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>
}

export function SavingsMetrics() {
  const { transactions } = useData()
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<{
    savingsRate: number
    totalIncome: number
    totalExpenses: number
    totalSavings: number
    monthlyData: Array<{
      month: string
      income: number
      expenses: number
      savings: number
      savingsRate: number
    }>
    incomeStability: {
      cv: number
      rating: string
    }
    expenseVolatility: {
      cv: number
      rating: string
    }
  } | null>(null)

  useEffect(() => {
    if (transactions.length === 0) {
      setIsLoading(false)
      return
    }

    // Calculate metrics from transactions
    const monthlyMap = new Map<string, { income: number; expenses: number }>()

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expenses: 0 })
      }

      const bucket = monthlyMap.get(monthKey)!
      if (t.type === "income") {
        bucket.income += Math.abs(t.amount)
      } else if (t.type === "expense") {
        bucket.expenses += Math.abs(t.amount)
      }
    })

    const monthlyData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => {
        const savings = data.income - data.expenses
        const savingsRate = data.income > 0 ? (savings / data.income) * 100 : 0
        return {
          month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          income: data.income,
          expenses: data.expenses,
          savings,
          savingsRate,
        }
      })

    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0)
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0)
    const totalSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

    // Calculate income stability (coefficient of variation)
    const incomes = monthlyData.map((m) => m.income).filter((i) => i > 0)
    const incomeMean = incomes.reduce((a, b) => a + b, 0) / incomes.length || 0
    const incomeStdDev = Math.sqrt(
      incomes.reduce((sum, val) => sum + Math.pow(val - incomeMean, 2), 0) / incomes.length
    )
    const incomeCV = incomeMean > 0 ? (incomeStdDev / incomeMean) * 100 : 0

    // Calculate expense volatility
    const expenses = monthlyData.map((m) => m.expenses).filter((e) => e > 0)
    const expenseMean = expenses.reduce((a, b) => a + b, 0) / expenses.length || 0
    const expenseStdDev = Math.sqrt(
      expenses.reduce((sum, val) => sum + Math.pow(val - expenseMean, 2), 0) / expenses.length
    )
    const expenseCV = expenseMean > 0 ? (expenseStdDev / expenseMean) * 100 : 0

    const getStabilityRating = (cv: number) => {
      if (cv < 10) return "Very Stable"
      if (cv < 25) return "Stable"
      if (cv < 50) return "Variable"
      return "Highly Variable"
    }

    setMetrics({
      savingsRate,
      totalIncome,
      totalExpenses,
      totalSavings,
      monthlyData,
      incomeStability: {
        cv: incomeCV,
        rating: getStabilityRating(incomeCV),
      },
      expenseVolatility: {
        cv: expenseCV,
        rating: getStabilityRating(expenseCV),
      },
    })
    setIsLoading(false)
  }, [transactions])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics || transactions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <PiggyBank className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Add transactions to see savings metrics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Key Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Savings Rate */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-1">
                  <PiggyBank className="h-4 w-4" />
                  Savings Rate
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Percentage of income saved after expenses.</p>
                      <p className="text-xs mt-1">Formula: (Income - Expenses) / Income × 100</p>
                      <p className="text-xs mt-1">Target: 20%+ is excellent, 10-20% is good</p>
                    </TooltipContent>
                  </Tooltip>
                </CardDescription>
                {getSavingsRateBadge(metrics.savingsRate)}
              </div>
              <CardTitle className={`text-3xl ${getSavingsRateColor(metrics.savingsRate)}`}>
                {formatPercent(metrics.savingsRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={Math.max(0, Math.min(100, metrics.savingsRate * 2.5))} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-2">
                National average: ~8%
              </p>
            </CardContent>
          </Card>

          {/* Total Income */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Total Income
              </CardDescription>
              <CardTitle className="text-3xl text-emerald-500">
                {formatCurrency(metrics.totalIncome)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Stability:</span>
                <Badge variant="outline">{metrics.incomeStability.rating}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                CV: {metrics.incomeStability.cv.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Total Expenses
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {formatCurrency(metrics.totalExpenses)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Volatility:</span>
                <Badge variant="outline">{metrics.expenseVolatility.rating}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                CV: {metrics.expenseVolatility.cv.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Net Savings */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Net Savings
              </CardDescription>
              <CardTitle className={`text-3xl ${metrics.totalSavings >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(metrics.totalSavings)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {metrics.monthlyData.length} months of data
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {formatCurrency(metrics.totalSavings / Math.max(1, metrics.monthlyData.length))}/mo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Savings Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Savings Trend</CardTitle>
              <CardDescription>Income, expenses, and savings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.monthlyData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      name="Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--destructive))"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Savings Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Savings Rate</CardTitle>
              <CardDescription>Your savings percentage each month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="savingsRate" name="Savings Rate" radius={[4, 4, 0, 0]}>
                      {metrics.monthlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.savingsRate >= 20
                              ? "hsl(var(--success))"
                              : entry.savingsRate >= 10
                              ? "hsl(var(--chart-2))"
                              : entry.savingsRate >= 0
                              ? "hsl(var(--chart-4))"
                              : "hsl(var(--destructive))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
