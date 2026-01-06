"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  PiggyBank,
  ShieldAlert,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Trophy,
  Star,
} from "lucide-react"
import { useData } from "@/lib/data-context"

type InsightType = "positive" | "warning" | "alert" | "tip" | "achievement"

interface Insight {
  id: string
  type: InsightType
  category: string
  title: string
  message: string
  action?: string
  impact?: number
  priority: number
}

const getInsightConfig = (type: InsightType) => {
  switch (type) {
    case "positive":
      return {
        icon: TrendingUp,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
      }
    case "warning":
      return {
        icon: AlertTriangle,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
      }
    case "alert":
      return {
        icon: ShieldAlert,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
      }
    case "achievement":
      return {
        icon: Trophy,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
      }
    case "tip":
    default:
      return {
        icon: Lightbulb,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
      }
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

function InsightCard({ insight }: { insight: Insight }) {
  const config = getInsightConfig(insight.type)
  const Icon = config.icon

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md`}
    >
      <div className="flex gap-3">
        <div className={`shrink-0 rounded-full p-2 ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            {insight.impact && (
              <Badge variant="outline" className={config.color}>
                {insight.impact > 0 ? "+" : ""}
                {formatCurrency(insight.impact)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{insight.message}</p>
          {insight.action && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              {insight.action}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActionableInsights() {
  const { transactions } = useData()
  const [activeFilter, setActiveFilter] = useState<InsightType | "all">("all")

  // Generate insights from transaction data
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = []

    if (transactions.length === 0) return generatedInsights

    // Calculate basic metrics
    const monthlyData = new Map<string, { income: number; expenses: number }>()
    const categoryTotals = new Map<string, number>()
    
    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 })
      }

      const bucket = monthlyData.get(monthKey)!
      if (t.type === "income") {
        bucket.income += Math.abs(t.amount)
      } else if (t.type === "expense") {
        bucket.expenses += Math.abs(t.amount)
        
        const current = categoryTotals.get(t.category) || 0
        categoryTotals.set(t.category, current + Math.abs(t.amount))
      }
    })

    const months = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const totalIncome = months.reduce((sum, [, data]) => sum + data.income, 0)
    const totalExpenses = months.reduce((sum, [, data]) => sum + data.expenses, 0)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // 1. Savings Rate Insight
    if (savingsRate >= 20) {
      generatedInsights.push({
        id: "savings-excellent",
        type: "achievement",
        category: "Savings",
        title: "Excellent Savings Rate!",
        message: `You're saving ${savingsRate.toFixed(1)}% of your income - well above the recommended 20%.`,
        priority: 1,
      })
    } else if (savingsRate >= 10) {
      generatedInsights.push({
        id: "savings-good",
        type: "positive",
        category: "Savings",
        title: "Good Savings Progress",
        message: `You're saving ${savingsRate.toFixed(1)}% of your income. A small increase could make a big difference.`,
        action: "See savings tips",
        priority: 2,
      })
    } else if (savingsRate > 0) {
      generatedInsights.push({
        id: "savings-improve",
        type: "tip",
        category: "Savings",
        title: "Room for Improvement",
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 10-20% for financial security.`,
        action: "View budget recommendations",
        priority: 3,
      })
    } else {
      generatedInsights.push({
        id: "savings-negative",
        type: "alert",
        category: "Savings",
        title: "Spending Exceeds Income",
        message: "You're spending more than you earn. This is unsustainable and requires immediate attention.",
        action: "Create a budget",
        priority: 1,
      })
    }

    // 2. Month-over-Month Comparison
    if (months.length >= 2) {
      const lastMonth = months[months.length - 1][1]
      const prevMonth = months[months.length - 2][1]
      const expenseChange = ((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100

      if (expenseChange < -10) {
        generatedInsights.push({
          id: "expense-decrease",
          type: "positive",
          category: "Spending",
          title: "Great Cost Reduction!",
          message: `Your expenses decreased by ${Math.abs(expenseChange).toFixed(0)}% compared to last month.`,
          impact: prevMonth.expenses - lastMonth.expenses,
          priority: 2,
        })
      } else if (expenseChange > 20) {
        generatedInsights.push({
          id: "expense-increase",
          type: "warning",
          category: "Spending",
          title: "Spending Spike Detected",
          message: `Your expenses increased by ${expenseChange.toFixed(0)}% compared to last month.`,
          action: "Review transactions",
          priority: 2,
        })
      }
    }

    // 3. Top Spending Category
    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (topCategories.length > 0) {
      const topCategory = topCategories[0]
      const percentage = (topCategory[1] / totalExpenses) * 100

      if (percentage > 40) {
        generatedInsights.push({
          id: "top-category-high",
          type: "tip",
          category: "Analysis",
          title: `${topCategory[0]} is ${percentage.toFixed(0)}% of Spending`,
          message: `This category dominates your budget. Consider if there are opportunities to optimize.`,
          action: `Analyze ${topCategory[0]}`,
          priority: 3,
        })
      }
    }

    // 4. Income Consistency
    const incomes = months.map(([, data]) => data.income).filter((i) => i > 0)
    if (incomes.length >= 3) {
      const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length
      const variance = incomes.reduce((sum, val) => sum + Math.pow(val - avgIncome, 2), 0) / incomes.length
      const cv = (Math.sqrt(variance) / avgIncome) * 100

      if (cv < 10) {
        generatedInsights.push({
          id: "income-stable",
          type: "positive",
          category: "Income",
          title: "Stable Income Pattern",
          message: "Your income is very consistent, which is great for financial planning.",
          priority: 4,
        })
      } else if (cv > 30) {
        generatedInsights.push({
          id: "income-variable",
          type: "tip",
          category: "Income",
          title: "Variable Income Detected",
          message: "Your income varies significantly. Consider building a larger emergency fund.",
          action: "Calculate emergency fund",
          priority: 3,
        })
      }
    }

    // 5. Quick Win - Small reductions
    if (topCategories.length >= 2) {
      const discretionary = topCategories.filter(([cat]) =>
        ["Dining", "Entertainment", "Shopping", "Subscription", "Recreation"].some((d) =>
          cat.toLowerCase().includes(d.toLowerCase())
        )
      )

      if (discretionary.length > 0) {
        const potentialSavings = discretionary.reduce((sum, [, amt]) => sum + amt * 0.1, 0)
        if (potentialSavings > 50) {
          generatedInsights.push({
            id: "quick-win",
            type: "tip",
            category: "Opportunity",
            title: "Quick Win Available",
            message: `A 10% reduction in discretionary spending could save you money each month.`,
            impact: potentialSavings / months.length,
            action: "View categories",
            priority: 3,
          })
        }
      }
    }

    // Sort by priority
    return generatedInsights.sort((a, b) => a.priority - b.priority)
  }, [transactions])

  const filteredInsights =
    activeFilter === "all" ? insights : insights.filter((i) => i.type === activeFilter)

  const insightCounts = useMemo(() => {
    const counts: Record<string, number> = { all: insights.length }
    insights.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1
    })
    return counts
  }, [insights])

  if (transactions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No Insights Yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add transactions to get personalized financial insights
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Actionable Insights
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your financial data
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "achievement", "positive", "tip", "warning", "alert"] as const).map((filter) => {
                const count = insightCounts[filter] || 0
                if (filter !== "all" && count === 0) return null

                const config = filter === "all" ? null : getInsightConfig(filter)
                return (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className="capitalize"
                  >
                    {filter === "all" ? (
                      "All"
                    ) : config ? (
                      <config.icon className={`h-3 w-3 mr-1 ${activeFilter !== filter ? config.color : ""}`} />
                    ) : null}
                    {filter !== "all" && filter}
                    <Badge variant="secondary" className="ml-1.5">
                      {count}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="font-medium">All Clear!</p>
              <p className="text-sm text-muted-foreground">
                No {activeFilter !== "all" ? activeFilter : ""} insights at this time
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-purple-500" />
              Achievements
            </CardDescription>
            <CardTitle className="text-2xl text-purple-500">{insightCounts.achievement || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Positive
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{insightCounts.positive || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              Tips
            </CardDescription>
            <CardTitle className="text-2xl text-blue-500">{insightCounts.tip || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardDescription>
            <CardTitle className="text-2xl text-amber-500">
              {(insightCounts.warning || 0) + (insightCounts.alert || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
