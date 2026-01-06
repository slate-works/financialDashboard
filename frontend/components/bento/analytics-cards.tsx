"use client"

import { useState, useEffect, useCallback } from "react"
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
  AlertTriangle,
  Shield,
  Target,
  Clock,
  Zap,
  Gauge,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { getApiUrl } from "@/lib/config"
import { cn } from "@/lib/utils"

interface AnalyticsSummary {
  stability: {
    index: number
    rating: string
    explanation: string
  }
  runway: {
    months: number | null
    status: string
    burnRate: number
    recommendation: string
  }
  forecast: {
    nextMonth: number
    confidence: string
    trend: string
  }
  recurring: {
    monthlyTotal: number
    annualTotal: number
    confirmedCount: number
  }
  adherence: {
    score: number
    rating: string
    trend: string
  } | null
  dataQuality: {
    transactionCount: number
    monthsOfData: number
    budgetCount: number
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const getTrendIcon = (trend: string) => {
  if (trend === "increasing") return <TrendingUp className="h-4 w-4 text-amber-500" />
  if (trend === "decreasing") return <TrendingDown className="h-4 w-4 text-emerald-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "critical":
      return "text-red-500"
    case "caution":
      return "text-amber-500"
    case "adequate":
    case "comfortable":
      return "text-emerald-500"
    case "surplus":
      return "text-blue-500"
    default:
      return "text-muted-foreground"
  }
}

const getConfidenceBadge = (confidence: string) => {
  switch (confidence.toLowerCase()) {
    case "high":
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">High Confidence</Badge>
    case "medium":
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Medium Confidence</Badge>
    case "low":
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Low Confidence</Badge>
    default:
      return <Badge variant="outline">Insufficient Data</Badge>
  }
}

export function AnalyticsCards({ cashOnHand = 10000 }: { cashOnHand?: number }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/analytics/summary?cash=${cashOnHand}`)
      
      if (!response.ok) throw new Error("Failed to load analytics")
      
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      console.error("Error loading analytics summary:", err)
      setError("Unable to load analytics")
    } finally {
      setIsLoading(false)
    }
  }, [cashOnHand])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error || "No analytics data available"}</p>
          <p className="text-sm text-muted-foreground mt-1">Add transactions to see financial insights</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash Flow Stability */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                Cash Flow Stability
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Measures predictability of your monthly cash flow (0-100). Higher = more stable and predictable finances.</p>
                    <p className="text-xs mt-1">Formula: 100 × (1 − CV) × (1 − non_recurring_ratio)</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
              <Badge variant="outline" className="text-xs">{summary.stability.rating}</Badge>
            </div>
            <CardTitle className="text-3xl">{summary.stability.index}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={summary.stability.index} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{summary.stability.explanation}</p>
          </CardContent>
        </Card>

        {/* Financial Runway */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Financial Runway
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Months your cash reserves will last at current burn rate.</p>
                    <p className="text-xs mt-1">Formula: Cash On Hand / Net Burn Rate</p>
                    <p className="text-xs">Critical: &lt;3 mo | Caution: 3-6 mo | Adequate: 6-12 mo</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </div>
            <CardTitle className={cn("text-3xl", getStatusColor(summary.runway.status))}>
              {summary.runway.months !== null ? `${summary.runway.months.toFixed(1)} mo` : "∞"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Net burn rate</span>
              <span className={summary.runway.burnRate < 0 ? "text-emerald-500" : "text-red-500"}>
                {formatCurrency(Math.abs(summary.runway.burnRate))}/mo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{summary.runway.recommendation}</p>
          </CardContent>
        </Card>

        {/* Expense Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Next Month Forecast
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Predicted total expenses for next month using exponential smoothing.</p>
                    <p className="text-xs mt-1">Uses Holt's linear method for trend detection.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
              {getTrendIcon(summary.forecast.trend)}
            </div>
            <CardTitle className="text-3xl">{formatCurrency(summary.forecast.nextMonth)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground capitalize">{summary.forecast.trend} trend</span>
              {getConfidenceBadge(summary.forecast.confidence)}
            </div>
          </CardContent>
        </Card>

        {/* Recurring Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Recurring Expenses
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Auto-detected subscriptions and regular bills based on transaction patterns.</p>
                    <p className="text-xs mt-1">Uses temporal pattern detection with confidence scoring.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
              <Badge variant="outline">{summary.recurring.confirmedCount} confirmed</Badge>
            </div>
            <CardTitle className="text-3xl">{formatCurrency(summary.recurring.monthlyTotal)}<span className="text-lg font-normal text-muted-foreground">/mo</span></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(summary.recurring.annualTotal)} per year in recurring costs
            </p>
          </CardContent>
        </Card>

        {/* Budget Adherence */}
        {summary.adherence ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Budget Adherence
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>How closely you stick to your category budgets (0-100).</p>
                      <p className="text-xs mt-1">Score = 100 × (1 − |variance|), weighted by budget size.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardDescription>
                <Badge variant="outline">{summary.adherence.rating}</Badge>
              </div>
              <CardTitle className="text-3xl">{summary.adherence.score}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={summary.adherence.score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 capitalize">
                Trend: {summary.adherence.trend}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Budget Adherence
              </CardDescription>
              <CardTitle className="text-xl text-muted-foreground">Not Configured</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Set up budgets to track adherence</p>
            </CardContent>
          </Card>
        )}

        {/* Data Quality */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Data Quality
              </CardDescription>
            </div>
            <CardTitle className="text-3xl">{summary.dataQuality.transactionCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{summary.dataQuality.monthsOfData} months of transaction data</p>
              <p>{summary.dataQuality.budgetCount} category budgets configured</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
