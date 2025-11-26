"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Transaction } from "@/types/transaction"
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

export function DashboardCharts({ transactions }: DashboardChartsProps) {
  // Spending by category
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

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    color: CATEGORY_COLORS[name] || "#6b7280",
  }))

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

  const monthlyChartData = Object.values(monthlyData)
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
    </div>
  )
}
