"use client"

import { useState, useMemo, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import { fixTextEncoding } from "@/lib/format"
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

interface DashboardChartsProps {
  transactions: Transaction[]
}

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#f59e0b", // amber
  Transportation: "#3b82f6", // blue
  Shopping: "#ec4899", // pink
  Entertainment: "#8b5cf6", // purple
  Bills: "#ef4444", // red
  Healthcare: "#10b981", // emerald
  Salary: "#14b8a6", // teal
  Freelance: "#06b6d4", // cyan
}

function DashboardChartsComponent({ transactions }: DashboardChartsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())

  // Spending by category
  const categoryChartData = useMemo(() => {
    const categoryData = transactions
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          const category = t.category
          if (!acc[category]) {
            acc[category] = 0
          }
          acc[category] += Math.abs(t.amount)
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
      color: CATEGORY_COLORS[name] || "#6b7280",
    }))
  }, [transactions])

  // Top 5 categories for current month
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  const top5Categories = useMemo(() => {
    const currentMonthCategories = transactions
      .filter((t) => {
        const date = new Date(t.date)
        const month = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        return t.type === "expense" && month === currentMonth
      })
      .reduce(
        (acc, t) => {
          if (!acc[t.category]) acc[t.category] = 0
          acc[t.category] += Math.abs(t.amount)
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(currentMonthCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        name: fixTextEncoding(name),
        value: Number(value.toFixed(2)),
        color: CATEGORY_COLORS[name] || "#6b7280",
      }))
  }, [transactions, currentMonth])

  // Category trend over time
  const allCategories = useMemo(
    () => Array.from(new Set(transactions.map((t) => fixTextEncoding(t.category)))).sort(),
    [transactions],
  )
  
  const categoryTrendData = useMemo(() => {
    if (!selectedCategory) return []

    const monthlyTrend = transactions
      .filter((t) => fixTextEncoding(t.category) === selectedCategory)
      .reduce(
        (acc, t) => {
          const date = new Date(t.date)
          const month = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          if (!acc[month]) acc[month] = 0
          acc[month] += Math.abs(t.amount)
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(monthlyTrend)
      .map(([month, amount]) => ({
        month,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ")
        const [bMonth, bYear] = b.month.split(" ")
        return new Date(`${aMonth} 1, 20${bYear}`).getTime() - new Date(`${bMonth} 1, 20${bYear}`).getTime()
      })
  }, [selectedCategory, transactions])

  // Daily spending heatmap data for selected month
  const dailySpendingCalendar = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday
    
    // Create daily data for the month
    const dailyData: Record<string, { income: number; expenses: number; net: number }> = {}
    
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
        dailyData[date].net = dailyData[date].income - dailyData[date].expenses
      }
    })
    
    // Build calendar grid
    const calendar: Array<{ day: number; date: string; data?: { income: number; expenses: number; net: number; color: string } }> = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ day: 0, date: '' })
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day).toISOString().split("T")[0]
      const data = dailyData[date]
      
      if (data) {
        const color = data.net > 100 ? "#10b981" : data.net < -100 ? "#ef4444" : "#6b7280"
        calendar.push({ day, date, data: { ...data, color } })
      } else {
        calendar.push({ day, date, data: { income: 0, expenses: 0, net: 0, color: "#1f2937" } })
      }
    }
    
    return calendar
  }, [transactions, calendarMonth])
  
  const goToPreviousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
  }
  
  const monthYearDisplay = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const monthlyChartData = useMemo(() => {
    const monthlyData = transactions.reduce(
      (acc, t) => {
        const date = new Date(t.date)
        const month = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
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
      {} as Record<string, any>,
    )

    return Object.values(monthlyData)
      .map((d: any) => ({
        month: d.month,
        income: Number(d.income.toFixed(2)),
        expenses: Number(d.expenses.toFixed(2)),
        net: Number(d.net.toFixed(2)),
        netColor: d.net >= 0 ? "#10b981" : "#ef4444",
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ")
        const [bMonth, bYear] = b.month.split(" ")
        return new Date(`${aMonth} 1, 20${aYear}`).getTime() - new Date(`${bMonth} 1, 20${bYear}`).getTime()
      })
  }, [transactions])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Spending by Category - Pie Chart */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Distribution of your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={categoryChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown - Bar Chart */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Total spending per category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Net Cash Flow Trend</CardTitle>
          <CardDescription>Month-over-month net cash flow (income - expenses)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                name="Net Cash Flow"
                dot={{ r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Income vs Expenses Over Time</CardTitle>
          <CardDescription>Monthly comparison showing financial performance at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 Categories This Month */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Top 5 Categories (This Month)</CardTitle>
          <CardDescription>Highest spending categories in {currentMonth}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top5Categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {top5Categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Trend Over Time */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle>Category Trend Over Time</CardTitle>
          <CardDescription>Monthly spending for selected category</CardDescription>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
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
          {selectedCategory && categoryTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={categoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              {selectedCategory ? "No data for this category" : "Select a category to view trend"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Spending Heatmap */}
      <Card className="lg:col-span-2 transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Activity Calendar</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold min-w-[120px] text-center">{monthYearDisplay}</div>
                <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              <span className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  <span className="whitespace-nowrap">High Income (&gt;$100)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                  <span className="whitespace-nowrap">High Expense (&gt;$100)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-500"></span>
                  <span className="whitespace-nowrap">Low Activity</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-900"></span>
                  <span className="whitespace-nowrap">No Activity</span>
                </span>
              </span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {dailySpendingCalendar.map((cell, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded flex flex-col items-center justify-center text-xs p-1 ${
                    cell.day === 0 ? "invisible" : ""
                  }`}
                  style={{ backgroundColor: cell.data?.color || "#1f2937" }}
                  title={
                    cell.data && cell.day > 0
                      ? `${cell.date}: Income $${cell.data.income.toFixed(2)}, Expenses $${cell.data.expenses.toFixed(2)}, Net $${cell.data.net.toFixed(2)}`
                      : ""
                  }
                >
                  {cell.day > 0 && (
                    <>
                      <div className="text-white font-semibold">{cell.day}</div>
                      {cell.data && Math.abs(cell.data.net) > 0 && (
                        <div className="text-white text-[10px]">${Math.abs(cell.data.net).toFixed(0)}</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Memoize component with custom comparison to prevent re-renders when transactions
// array reference changes but content is the same
export const DashboardCharts = memo(DashboardChartsComponent, (prevProps, nextProps) => {
  // If lengths differ, props changed
  if (prevProps.transactions.length !== nextProps.transactions.length) {
    return false
  }
  
  // Compare transaction IDs to detect actual changes
  const prevIds = new Set(prevProps.transactions.map(t => t.id))
  const nextIds = new Set(nextProps.transactions.map(t => t.id))
  
  if (prevIds.size !== nextIds.size) {
    return false
  }
  
  // Check if all IDs are the same
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false
    }
  }
  
  // Props are equal, don't re-render (return true means equal)
  return true
})
