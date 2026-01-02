"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  CreditCard,
  Home,
  Smartphone,
  Wifi,
  Car,
  Shield,
  Tv,
  Music,
  Cloud,
} from "lucide-react"
import { fetchRecurring } from "@/lib/analytics-api"
import type { RecurringPattern, RecurringAnalysis } from "@/types/analytics"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(value))

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })

const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase()
  if (lower.includes("rent") || lower.includes("mortgage") || lower.includes("housing")) return Home
  if (lower.includes("phone") || lower.includes("mobile")) return Smartphone
  if (lower.includes("internet") || lower.includes("wifi")) return Wifi
  if (lower.includes("car") || lower.includes("auto") || lower.includes("transport")) return Car
  if (lower.includes("insurance")) return Shield
  if (lower.includes("streaming") || lower.includes("netflix") || lower.includes("hulu")) return Tv
  if (lower.includes("music") || lower.includes("spotify")) return Music
  if (lower.includes("cloud") || lower.includes("storage")) return Cloud
  return CreditCard
}

const getPeriodColor = (period: string) => {
  switch (period) {
    case "Weekly":
      return "bg-purple-500"
    case "Bi-weekly":
      return "bg-indigo-500"
    case "Monthly":
      return "bg-blue-500"
    case "Quarterly":
      return "bg-amber-500"
    case "Annual":
      return "bg-emerald-500"
    default:
      return "bg-gray-500"
  }
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function PatternCard({ pattern }: { pattern: RecurringPattern }) {
  const Icon = getCategoryIcon(pattern.category)
  const isConfirmed = pattern.status === "Confirmed"
  const daysUntilNext = Math.ceil(
    (new Date(pattern.nextExpectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{pattern.merchant}</h4>
            <span className="font-bold text-sm">{formatCurrency(pattern.avgAmount)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-xs ${getPeriodColor(pattern.period)} text-white`}>
              {pattern.period}
            </Badge>
            <Badge variant={isConfirmed ? "default" : "secondary"} className="text-xs">
              {isConfirmed ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmed
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Detected
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{pattern.occurrences} occurrences</span>
            <span>
              {daysUntilNext > 0 ? (
                <>Next: {formatDate(pattern.nextExpectedDate)} ({daysUntilNext}d)</>
              ) : daysUntilNext === 0 ? (
                <span className="text-amber-500">Due today</span>
              ) : (
                <span className="text-red-500">Overdue</span>
              )}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Confidence</span>
              <span>{pattern.confidence.toFixed(0)}%</span>
            </div>
            <Progress value={pattern.confidence} className="h-1" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function RecurringExpenses() {
  const [data, setData] = useState<RecurringAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchRecurring()
      setData(result)
    } catch (err) {
      console.error("Error loading recurring data:", err)
      setError("Failed to load recurring expenses")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error || "No recurring expense data"}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { patterns, totals, confirmedCount, unconfirmedCount } = data

  // Group patterns by period for chart
  const periodData = patterns.reduce((acc, p) => {
    const existing = acc.find((d) => d.period === p.period)
    if (existing) {
      existing.amount += p.avgAmount
      existing.count += 1
    } else {
      acc.push({ period: p.period, amount: p.avgAmount, count: 1 })
    }
    return acc
  }, [] as Array<{ period: string; amount: number; count: number }>)

  // Group by category for pie chart
  const categoryData = patterns.reduce((acc, p) => {
    const existing = acc.find((d) => d.category === p.category)
    if (existing) {
      existing.amount += p.avgAmount
    } else {
      acc.push({ category: p.category, amount: p.avgAmount })
    }
    return acc
  }, [] as Array<{ category: string; amount: number }>)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const confirmed = patterns.filter((p) => p.status === "Confirmed")
  const unconfirmed = patterns.filter((p) => p.status !== "Confirmed")

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Monthly Total
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.monthly)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Recurring each month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Annual Total
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.annual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Projected yearly cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Confirmed
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{confirmedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Verified recurring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-amber-500" />
              Detected
            </CardDescription>
            <CardTitle className="text-2xl text-amber-500">{unconfirmedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
            <CardDescription>Top recurring expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.category} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span>{item.category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Frequency Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>By Frequency</CardTitle>
            <CardDescription>Monthly cost breakdown by billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="period" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Detected Patterns
              </CardTitle>
              <CardDescription>
                Auto-detected recurring transactions from your spending history
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="confirmed">
            <TabsList>
              <TabsTrigger value="confirmed">
                Confirmed ({confirmed.length})
              </TabsTrigger>
              <TabsTrigger value="detected">
                Detected ({unconfirmed.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({patterns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="confirmed" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {confirmed.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No confirmed recurring expenses yet
                    </p>
                  ) : (
                    confirmed.map((pattern) => (
                      <PatternCard key={pattern.merchant} pattern={pattern} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="detected" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {unconfirmed.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No newly detected patterns
                    </p>
                  ) : (
                    unconfirmed.map((pattern) => (
                      <PatternCard key={pattern.merchant} pattern={pattern} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {patterns.map((pattern) => (
                    <PatternCard key={pattern.merchant} pattern={pattern} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
