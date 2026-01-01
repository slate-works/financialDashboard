"use client"

import { useMemo } from "react"
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
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useData } from "@/lib/data-context"
import { formatCurrency, formatDate, getCurrentMonthYear, fixTextEncoding } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { transactions, overview, isLoading } = useData()

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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Financial overview for ${getCurrentMonthYear()}`}
      />

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Cash Flow"
          value={formatCurrency(thisMonth.net)}
          subtitle={`${formatCurrency(thisMonth.income)} in • ${formatCurrency(thisMonth.expenses)} out`}
          icon={thisMonth.net >= 0 ? TrendingUp : TrendingDown}
          trend={thisMonth.net >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="Savings Rate"
          value={overview?.savingsRate ? `${overview.savingsRate.toFixed(1)}%` : "--"}
          subtitle="Target: 15-30% monthly"
          icon={PiggyBank}
          trend={
            overview?.savingsRate
              ? overview.savingsRate >= 15
                ? "positive"
                : overview.savingsRate >= 5
                ? "neutral"
                : "negative"
              : "neutral"
          }
        />
        <StatCard
          title="Budget Adherence"
          value={overview?.budgetAdherence ? `${overview.budgetAdherence.toFixed(0)}%` : "--"}
          subtitle="vs. 85% spend target"
          icon={Activity}
          trend={
            overview?.budgetAdherence
              ? overview.budgetAdherence <= 100
                ? "positive"
                : "negative"
              : "neutral"
          }
        />
        <StatCard
          title="Total Transactions"
          value={`${transactions.length}`}
          subtitle={`${thisMonth.count} this month`}
          icon={Receipt}
          trend="neutral"
        />
      </div>

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
                        {formatDate(t.date, "short")} • {fixTextEncoding(t.category)}
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
          {/* Savings Goal Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Goal</CardTitle>
              <CardDescription>Save at least 15% of income</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current rate</span>
                <span className="font-semibold">
                  {overview?.savingsRate ? `${overview.savingsRate.toFixed(1)}%` : "--"}
                </span>
              </div>
              <Progress
                value={Math.min(100, (overview?.savingsRate ?? 0) / 0.3 * 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {overview?.savingsRate && overview.savingsRate >= 15
                  ? "Great job! You're on track."
                  : "Try to reduce discretionary spending to hit your goal."}
              </p>
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

      {/* Category Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Top Spending Categories</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/insights" className="gap-1">
                See details <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview?.topCategories && overview.topCategories.length > 0 ? (
              <div className="space-y-4">
                {overview.topCategories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <Progress
                      value={
                        (cat.amount /
                          Math.max(...overview.topCategories.map((c) => c.amount))) *
                        100
                      }
                      className="h-1.5"
                    />
                  </div>
                ))}
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
