"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRight,
  Receipt,
  BarChart3,
  Activity,
  DollarSign,
  Calendar,
  Gauge,
  LineChart,
  CalendarDays,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { MetricCard, InsightCard, DataCompletenessIndicator } from "@/components/metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { formatCurrency, formatDate, getCurrentMonthYear, fixTextEncoding } from "@/lib/format"
import { cn } from "@/lib/utils"

const TIME_PERIODS = [
  { value: "1", label: "Last month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "24", label: "Last 2 years" },
]

function formatPeriodDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  })
}

export default function DashboardPage() {
  const { transactions, analytics, isLoading, loadAnalytics } = useData()
  const [selectedPeriod, setSelectedPeriod] = useState("6")
  const [isChangingPeriod, setIsChangingPeriod] = useState(false)

  // Load analytics when period changes
  const handlePeriodChange = async (value: string) => {
    setSelectedPeriod(value)
    setIsChangingPeriod(true)
    await loadAnalytics(parseInt(value, 10))
    setIsChangingPeriod(false)
  }

  // Calculate this month's stats
  const thisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const monthTransactions = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, expenses, net: income - expenses, count: monthTransactions.length }
  }, [transactions])

  // Get recent transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [transactions])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Format the analysis period for display
  const periodDisplay = analytics?.period 
    ? `${formatPeriodDate(analytics.period.start)} – ${formatPeriodDate(analytics.period.end)}`
    : null

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description={periodDisplay 
            ? `Analysis period: ${periodDisplay}`
            : `Financial overview for ${getCurrentMonthYear()}`}
        />
        
        {/* Time Period Selector */}
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Quality Indicator - show when analytics available */}
      {analytics && analytics.dataCompleteness.confidence !== "high" && !isChangingPeriod && (
        <DataCompletenessIndicator completeness={analytics.dataCompleteness} />
      )}

      {/* Main Metrics - Using Analytics Engine */}
      {analytics && !isChangingPeriod ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            metric={analytics.metrics.netCashFlow}
            icon={analytics.metrics.netCashFlow.value && analytics.metrics.netCashFlow.value >= 0 
              ? TrendingUp 
              : TrendingDown}
          />
          <MetricCard
            metric={analytics.metrics.savingsRate}
            icon={PiggyBank}
          />
          <MetricCard
            metric={analytics.metrics.budgetAdherence}
            icon={Gauge}
          />
          <MetricCard
            metric={analytics.metrics.incomeStability}
            icon={LineChart}
          />
        </div>
      ) : isChangingPeriod ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(thisMonth.net)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(thisMonth.income)} in - {formatCurrency(thisMonth.expenses)} out
              </p>
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading Analytics...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading Analytics...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{transactions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{thisMonth.count} this month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights - Actionable Analysis */}
      {analytics && analytics.insights.length > 0 && !isChangingPeriod && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Analysis Insights</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {analytics.insights.slice(0, 4).map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions" className="gap-1">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/import">Import your data</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{fixTextEncoding(t.description)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date, "short")} - {fixTextEncoding(t.category)}
                      </p>
                    </div>
                    <p
                      className={`ml-4 shrink-0 font-semibold tabular-nums ${
                        t.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(Math.abs(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Goal Tracking - with data validation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Goal</CardTitle>
              <CardDescription>
                {analytics?.goalTracking.isEvaluable 
                  ? "Track progress toward your savings target"
                  : "Savings goal tracking"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics?.goalTracking.isEvaluable ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current rate</span>
                    <span className="font-semibold">
                      {analytics.metrics.savingsRate.displayValue}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.max(0, analytics.goalTracking.savingsGoalProgress ?? 0))}
                    className="h-2"
                  />
                  {analytics.goalTracking.projectedMonthEnd && (
                    <div className="rounded bg-muted/50 p-2 text-xs">
                      <p className="font-medium mb-1">Month-end projection:</p>
                      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                        <span>Projected savings:</span>
                        <span className="text-right font-mono">
                          {formatCurrency(analytics.goalTracking.projectedMonthEnd.savings ?? 0)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {analytics.goalTracking.daysRemainingInMonth} days remaining
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded bg-muted/30 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {analytics?.goalTracking.reason || "Add more transactions to enable goal tracking"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Month Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">This Month</CardTitle>
              <CardDescription>{getCurrentMonthYear()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-semibold text-success tabular-nums">
                  +{formatCurrency(thisMonth.income)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-semibold text-destructive tabular-nums">
                  -{formatCurrency(thisMonth.expenses)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Net</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      thisMonth.net >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {thisMonth.net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(thisMonth.net))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Breakdown & Trend Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Categories with Analysis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Top Spending Categories</CardTitle>
              <CardDescription>With month-over-month analysis</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/insights" className="gap-1">
                See details <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {analytics?.categoryAnalysis.topExpenseCategories && 
             analytics.categoryAnalysis.topExpenseCategories.length > 0 ? (
              <div className="space-y-4">
                {analytics.categoryAnalysis.topExpenseCategories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fixTextEncoding(cat.category)}</span>
                        {cat.isVolatile && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-warning">
                            Volatile
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {formatCurrency(cat.amount)}
                        </span>
                        {cat.monthOverMonthChange !== null && (
                          <span className={cn(
                            "text-xs tabular-nums",
                            cat.monthOverMonthChange > 10 ? "text-destructive" :
                            cat.monthOverMonthChange < -10 ? "text-success" :
                            "text-muted-foreground"
                          )}>
                            {cat.monthOverMonthChange > 0 ? "+" : ""}
                            {cat.monthOverMonthChange.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={cat.percentOfTotal}
                      className="h-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {cat.percentOfTotal.toFixed(1)}% of total expenses
                    </p>
                  </div>
                ))}
                
                {/* Fixed vs Variable breakdown */}
                {analytics.categoryAnalysis.fixedVsVariable && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium mb-2">Expense Structure</p>
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 rounded bg-primary/20 p-2 text-center">
                        <p className="text-lg font-semibold">
                          {(analytics.categoryAnalysis.fixedVsVariable.ratio * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Fixed</p>
                      </div>
                      <div className="flex-1 rounded bg-muted p-2 text-center">
                        <p className="text-lg font-semibold">
                          {((1 - analytics.categoryAnalysis.fixedVsVariable.ratio) * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Variable</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.categoryAnalysis.fixedVsVariable.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Add transactions to see category breakdown
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link
              href="/entry"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto flex-col gap-2 py-4"
              )}
            >
              <DollarSign className="size-5" />
              <span className="text-sm">Add Entry</span>
            </Link>
            <Link
              href="/import"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto flex-col gap-2 py-4"
              )}
            >
              <Receipt className="size-5" />
              <span className="text-sm">Import CSV</span>
            </Link>
            <Link
              href="/transactions"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto flex-col gap-2 py-4"
              )}
            >
              <Calendar className="size-5" />
              <span className="text-sm">Transactions</span>
            </Link>
            <Link
              href="/insights"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto flex-col gap-2 py-4"
              )}
            >
              <BarChart3 className="size-5" />
              <span className="text-sm">Insights</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
