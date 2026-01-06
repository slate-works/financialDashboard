"use client"

import { useState, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PiggyBank,
  ShieldAlert,
  RefreshCw,
  Shield,
  TrendingUp,
  Lightbulb,
  BarChart3,
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { fixTextEncoding } from "@/lib/format"
import { AnalyticsCards } from "@/components/bento/analytics-cards"
import {
  SavingsMetrics,
  AnomalyAlerts,
  EmergencyFundCalculator,
  ActionableInsights,
  RecurringExpenses,
  InvestmentSimulator,
} from "@/components/analytics"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

// Theme-aware chart colors using CSS variables
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
]

export default function InsightsPage() {
  const { transactions, isLoading } = useData()
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState("overview")

  // Spending by category
  const categoryChartData = useMemo(() => {
    const categoryData = transactions
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          const category = t.category
          if (!acc[category]) acc[category] = 0
          acc[category] += Math.abs(t.amount)
          return acc
        },
        {} as Record<string, number>
      )

    return Object.entries(categoryData)
      .map(([name, value], index) => ({
        name: fixTextEncoding(name),
        value: Number(value.toFixed(2)),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Monthly data
  const monthlyChartData = useMemo(() => {
    const monthlyData = transactions.reduce(
      (acc, t) => {
        const date = new Date(t.date)
        const month = date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        })
        if (!acc[month]) {
          acc[month] = { month, income: 0, expenses: 0, net: 0 }
        }
        if (t.type === "income") {
          acc[month].income += Math.abs(t.amount)
        } else {
          acc[month].expenses += Math.abs(t.amount)
        }
        acc[month].net = acc[month].income - acc[month].expenses
        return acc
      },
      {} as Record<string, { month: string; income: number; expenses: number; net: number }>
    )

    return Object.values(monthlyData)
      .map((d) => ({
        month: d.month,
        income: Number(d.income.toFixed(2)),
        expenses: Number(d.expenses.toFixed(2)),
        net: Number(d.net.toFixed(2)),
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ")
        const [bMonth, bYear] = b.month.split(" ")
        return (
          new Date(`${aMonth} 1, 20${aYear}`).getTime() -
          new Date(`${bMonth} 1, 20${bYear}`).getTime()
        )
      })
  }, [transactions])

  // All categories
  const allCategories = useMemo(
    () => Array.from(new Set(transactions.map((t) => fixTextEncoding(t.category)))).sort(),
    [transactions]
  )

  // Category trend
  const categoryTrendData = useMemo(() => {
    if (!selectedCategory) return []

    const monthlyTrend = transactions
      .filter((t) => fixTextEncoding(t.category) === selectedCategory)
      .reduce(
        (acc, t) => {
          const date = new Date(t.date)
          const month = date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          })
          if (!acc[month]) acc[month] = 0
          acc[month] += Math.abs(t.amount)
          return acc
        },
        {} as Record<string, number>
      )

    return Object.entries(monthlyTrend)
      .map(([month, amount]) => ({
        month,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ")
        const [bMonth, bYear] = b.month.split(" ")
        return (
          new Date(`${aMonth} 1, 20${aYear}`).getTime() -
          new Date(`${bMonth} 1, 20${bYear}`).getTime()
        )
      })
  }, [selectedCategory, transactions])

  // Daily calendar data
  const dailySpendingCalendar = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const dailyData: Record<
      string,
      { income: number; expenses: number; net: number }
    > = {}

    transactions.forEach((t) => {
      const tDate = new Date(t.date)
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const date = tDate.toISOString().split("T")[0]
        if (!dailyData[date]) {
          dailyData[date] = { income: 0, expenses: 0, net: 0 }
        }
        if (t.type === "income") {
          dailyData[date].income += Math.abs(t.amount)
        } else {
          dailyData[date].expenses += Math.abs(t.amount)
        }
        dailyData[date].net =
          dailyData[date].income - dailyData[date].expenses
      }
    })

    const calendar: Array<{
      day: number
      date: string
      data?: { income: number; expenses: number; net: number }
    }> = []

    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ day: 0, date: "" })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day).toISOString().split("T")[0]
      calendar.push({ day, date, data: dailyData[date] })
    }

    return calendar
  }, [transactions, calendarMonth])

  const monthYearDisplay = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  if (isLoading) {
    return <InsightsSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Insights"
        description="Comprehensive analysis of your financial health"
      />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              Add some transactions to see insights and charts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="savings" className="flex items-center gap-1">
              <PiggyBank className="h-4 w-4" />
              <span className="hidden sm:inline">Savings</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Recurring</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Emergency</span>
            </TabsTrigger>
            <TabsTrigger value="invest" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Invest</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-4">Financial Health Summary</h2>
              <AnalyticsCards cashOnHand={10000} />
            </section>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Spending by Category - Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>Distribution of your expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryChartData.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {categoryChartData.slice(0, 6).map((item) => (
                      <div key={item.name} className="flex items-center gap-1 text-xs">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate max-w-[80px]">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Income vs Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <CardDescription>Monthly comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData.slice(-6)}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="hsl(var(--success))" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Savings Tab */}
          <TabsContent value="savings" className="space-y-6">
            <SavingsMetrics />
          </TabsContent>

          {/* Recurring Tab */}
          <TabsContent value="recurring" className="space-y-6">
            <RecurringExpenses />
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-6">
            <AnomalyAlerts />
          </TabsContent>

          {/* Emergency Fund Tab */}
          <TabsContent value="emergency" className="space-y-6">
            <EmergencyFundCalculator />
          </TabsContent>

          {/* Investment Tab */}
          <TabsContent value="invest" className="space-y-6">
            <InvestmentSimulator />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <ActionableInsights />
          </TabsContent>

          {/* Detailed Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {/* Net Cash Flow Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Net Cash Flow Trend</CardTitle>
                <CardDescription>Monthly net cash flow (income - expenses)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        name="Net Cash Flow"
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Trend */}
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Category Trend Over Time</CardTitle>
                  <CardDescription>Monthly spending for selected category</CardDescription>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {selectedCategory && categoryTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={categoryTrendData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--chart-5))"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "hsl(var(--chart-5))" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {selectedCategory ? "No data for this category" : "Select a category to view trend"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity Calendar */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Daily Activity Calendar</CardTitle>
                    <CardDescription>Daily income and expenses at a glance</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                        )
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="min-w-32 text-center font-semibold">{monthYearDisplay}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                        )
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-success" />
                    <span>Net positive (&gt;$100)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-destructive" />
                    <span>Net negative (&gt;$100)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-muted-foreground" />
                    <span>Low activity</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground sm:gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {dailySpendingCalendar.map((cell, index) => {
                    if (cell.day === 0) {
                      return <div key={index} className="aspect-square" />
                    }

                    const hasActivity = cell.data && (cell.data.income > 0 || cell.data.expenses > 0)
                    const net = cell.data?.net ?? 0

                    let bgColor = "bg-muted/50"
                    if (hasActivity) {
                      if (net > 100) bgColor = "bg-success"
                      else if (net < -100) bgColor = "bg-destructive"
                      else bgColor = "bg-muted-foreground"
                    }

                    return (
                      <div
                        key={index}
                        className={`flex aspect-square flex-col items-center justify-center rounded text-xs sm:text-sm ${bgColor} ${
                          hasActivity ? "text-white" : "text-foreground"
                        }`}
                        title={
                          cell.data
                            ? `${cell.date}: $${cell.data.income.toFixed(2)} in, $${cell.data.expenses.toFixed(2)} out`
                            : cell.date
                        }
                      >
                        <span className="font-semibold">{cell.day}</span>
                        {hasActivity && Math.abs(net) >= 10 && (
                          <span className="text-[10px]">${Math.abs(net).toFixed(0)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown - Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Total spending per category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData.slice(0, 10)} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {categoryChartData.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
