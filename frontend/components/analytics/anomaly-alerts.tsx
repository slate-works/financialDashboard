"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  RefreshCw,
  ChevronRight,
  DollarSign,
  Copy,
  Eye,
} from "lucide-react"
import { fetchAnomalies } from "@/lib/analytics-api"
import type { Anomaly, AnomalySummary } from "@/types/analytics"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(value))

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case "high":
      return {
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "High",
      }
    case "medium":
      return {
        icon: AlertCircle,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        label: "Medium",
      }
    default:
      return {
        icon: Info,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        label: "Low",
      }
  }
}

interface AnomalyCardProps {
  anomaly: Anomaly
}

function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const config = getSeverityConfig(anomaly.severity)
  const Icon = config.icon

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} transition-colors hover:bg-muted/50`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{anomaly.transaction.description}</p>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(anomaly.transaction.date)}</span>
            <span>•</span>
            <span>{anomaly.transaction.category}</span>
            <span>•</span>
            <span className={anomaly.transaction.type === "expense" ? "text-red-500" : "text-emerald-500"}>
              {formatCurrency(anomaly.transaction.amount)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {anomaly.reasons.map((reason, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Anomaly Score: {(anomaly.anomalyScore * 100).toFixed(0)}%
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [summary, setSummary] = useState<AnomalySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const loadAnomalies = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchAnomalies(days)
      setAnomalies(data.anomalies)
      setSummary(data.summary)
    } catch (err) {
      console.error("Error loading anomalies:", err)
      setError("Failed to load anomaly data")
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadAnomalies()
  }, [loadAnomalies])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadAnomalies}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const highSeverity = anomalies.filter((a) => a.severity === "high")
  const mediumSeverity = anomalies.filter((a) => a.severity === "medium")
  const lowSeverity = anomalies.filter((a) => a.severity === "low")

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions Analyzed</CardDescription>
            <CardTitle className="text-2xl">{summary?.totalChecked ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Last {days} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" />
              Flagged
            </CardDescription>
            <CardTitle className="text-2xl text-amber-500">{summary?.flaggedCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary && summary.totalChecked > 0
                ? `${((summary.flaggedCount / summary.totalChecked) * 100).toFixed(1)}% of transactions`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              High Severity
            </CardDescription>
            <CardTitle className="text-2xl text-red-500">{summary?.highSeverityCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Potential Savings
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-500">
              {formatCurrency(summary?.potentialSavings ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From duplicates & overspending</p>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Unusual Transactions
              </CardTitle>
              <CardDescription>
                Transactions that deviate from your normal spending patterns
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button variant="outline" size="sm" onClick={loadAnomalies}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
                <ShieldAlert className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="font-medium text-emerald-500">All Clear!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No unusual transactions detected in the last {days} days
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {highSeverity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      High Severity ({highSeverity.length})
                    </h4>
                    <div className="space-y-3">
                      {highSeverity.map((anomaly) => (
                        <AnomalyCard key={anomaly.transactionId} anomaly={anomaly} />
                      ))}
                    </div>
                  </div>
                )}

                {mediumSeverity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-500 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Medium Severity ({mediumSeverity.length})
                    </h4>
                    <div className="space-y-3">
                      {mediumSeverity.map((anomaly) => (
                        <AnomalyCard key={anomaly.transactionId} anomaly={anomaly} />
                      ))}
                    </div>
                  </div>
                )}

                {lowSeverity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Low Severity ({lowSeverity.length})
                    </h4>
                    <div className="space-y-3">
                      {lowSeverity.map((anomaly) => (
                        <AnomalyCard key={anomaly.transactionId} anomaly={anomaly} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detection Methods Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Anomalies Are Detected</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-medium text-sm">Amount Outliers</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Transactions significantly higher than your typical spending in that category (Z-score &gt; 2.5)
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Copy className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-medium text-sm">Possible Duplicates</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Multiple charges with the same amount and merchant on the same day
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-medium text-sm">New Merchants</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                First-time transactions with merchants you haven't used before
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
