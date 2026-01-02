"use client"

import { type LucideIcon, HelpCircle, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AnalyticsMetric, ConfidenceLevel } from "@/types/analytics"

interface MetricCardProps {
  metric: AnalyticsMetric<number | null>
  icon?: LucideIcon
  className?: string
  showRawData?: boolean
}

const confidenceConfig: Record<ConfidenceLevel, {
  label: string
  color: string
  bgColor: string
}> = {
  high: { 
    label: "High confidence", 
    color: "text-success",
    bgColor: "bg-success/10"
  },
  medium: { 
    label: "Medium confidence", 
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  low: { 
    label: "Low confidence", 
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  insufficient: { 
    label: "Insufficient data", 
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  },
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const config = confidenceConfig[level]
  return (
    <Badge 
      variant="outline" 
      className={cn("text-[10px] px-1.5 py-0", config.color, config.bgColor, "border-0")}
    >
      {level === "insufficient" ? "No data" : level}
    </Badge>
  )
}

function MetricTooltipContent({ metric }: { metric: AnalyticsMetric }) {
  return (
    <div className="max-w-xs space-y-3 p-1">
      {/* Definition */}
      <div>
        <p className="text-xs font-semibold text-foreground">What is this?</p>
        <p className="text-xs text-muted-foreground">{metric.definition}</p>
      </div>
      
      {/* Formula */}
      <div>
        <p className="text-xs font-semibold text-foreground">How it's calculated</p>
        <p className="text-xs font-mono text-muted-foreground">{metric.formula}</p>
      </div>
      
      {/* Raw data */}
      {metric.rawData && Object.keys(metric.rawData).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground">Raw numbers</p>
          <div className="mt-1 space-y-0.5">
            {Object.entries(metric.rawData).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span className="font-mono">
                  {typeof value === "number" ? value.toLocaleString(undefined, { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 2 
                  }) : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Requirements */}
      {metric.requirements.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground">Data requirements</p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {metric.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Invalid reason */}
      {metric.invalidReason && (
        <div className="rounded bg-destructive/10 p-2">
          <p className="text-xs text-destructive">{metric.invalidReason}</p>
        </div>
      )}
      
      {/* Benchmark */}
      {metric.benchmark && metric.isValid && (
        <div>
          <p className="text-xs font-semibold text-foreground">Target range</p>
          <p className="text-xs text-muted-foreground">
            {metric.benchmark.low}-{metric.benchmark.high}{metric.benchmark.unit} 
            {" "}(target: {metric.benchmark.target}{metric.benchmark.unit})
          </p>
        </div>
      )}
    </div>
  )
}

export function MetricCard({
  metric,
  icon: Icon,
  className,
  showRawData = false,
}: MetricCardProps) {
  const isPositive = metric.value !== null && metric.value > 0
  const isNegative = metric.value !== null && metric.value < 0
  
  // Determine trend color based on metric type and value
  const getTrendClass = () => {
    if (!metric.isValid || metric.value === null) return ""
    
    // For savings rate and net cash flow, positive is good
    if (metric.id === "savings_rate" || metric.id === "net_cash_flow") {
      if (metric.value >= 15) return "text-success"
      if (metric.value >= 0) return "text-warning"
      return "text-destructive"
    }
    
    // For budget adherence, >= 100 is good (under budget)
    if (metric.id === "budget_adherence") {
      if (metric.value >= 100) return "text-success"
      if (metric.value >= 90) return "text-warning"
      return "text-destructive"
    }
    
    // For income stability, higher is better
    if (metric.id === "income_stability") {
      if (metric.value >= 70) return "text-success"
      if (metric.value >= 50) return "text-warning"
      return "text-orange-500"
    }
    
    // For expense volatility, lower is better
    if (metric.id === "expense_volatility") {
      if (metric.value <= 20) return "text-success"
      if (metric.value <= 35) return "text-warning"
      return "text-orange-500"
    }
    
    return ""
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.name}
          </CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <HelpCircle className="size-3.5" />
                  <span className="sr-only">Learn more about {metric.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="w-80">
                <MetricTooltipContent metric={metric} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2",
              metric.isValid 
                ? getTrendClass().includes("success") 
                  ? "bg-success/10"
                  : getTrendClass().includes("destructive")
                  ? "bg-destructive/10"
                  : "bg-primary/10"
                : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "size-4",
                metric.isValid ? getTrendClass() : "text-muted-foreground"
              )}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <p className={cn("text-2xl font-semibold", getTrendClass())}>
            {metric.displayValue}
          </p>
          <ConfidenceBadge level={metric.confidence} />
        </div>
        
        {/* Interpretation - the key insight */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {metric.interpretation}
        </p>
        
        {/* Warning for low confidence */}
        {metric.confidence === "low" && metric.isValid && (
          <div className="flex items-start gap-1.5 rounded bg-warning/10 px-2 py-1.5">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" />
            <p className="text-[10px] text-warning">
              Limited data may affect accuracy
            </p>
          </div>
        )}
        
        {/* Show raw data if requested */}
        {showRawData && metric.rawData && Object.keys(metric.rawData).length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Raw Data</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {Object.entries(metric.rawData).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize truncate">
                    {key.replace(/([A-Z])/g, " $1").trim()}:
                  </span>
                  <span className="font-mono">
                    {typeof value === "number" 
                      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Insight card for displaying analysis insights
 */
interface InsightCardProps {
  insight: {
    type: "info" | "warning" | "success" | "error"
    title: string
    message: string
    isStatisticallySignificant: boolean
  }
}

const insightIcons: Record<string, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
}

const insightStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info: { 
    bg: "bg-blue-500/5", 
    border: "border-blue-500/20", 
    icon: "text-blue-500" 
  },
  warning: { 
    bg: "bg-warning/5", 
    border: "border-warning/20", 
    icon: "text-warning" 
  },
  success: { 
    bg: "bg-success/5", 
    border: "border-success/20", 
    icon: "text-success" 
  },
  error: { 
    bg: "bg-destructive/5", 
    border: "border-destructive/20", 
    icon: "text-destructive" 
  },
}

export function InsightCard({ insight }: InsightCardProps) {
  const Icon = insightIcons[insight.type]
  const styles = insightStyles[insight.type]
  
  return (
    <div className={cn(
      "flex gap-3 rounded-lg border p-4",
      styles.bg,
      styles.border
    )}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", styles.icon)} />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{insight.title}</p>
          {insight.isStatisticallySignificant && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Verified
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{insight.message}</p>
      </div>
    </div>
  )
}

/**
 * Data completeness indicator
 */
interface DataCompletenessIndicatorProps {
  completeness: {
    confidence: ConfidenceLevel
    transactionCoverage: number
    hasIncomeData: boolean
    hasExpenseData: boolean
    explanation: string
    warnings: string[]
  }
}

export function DataCompletenessIndicator({ completeness }: DataCompletenessIndicatorProps) {
  const config = confidenceConfig[completeness.confidence]
  
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Data Quality</h4>
        <Badge 
          variant="outline" 
          className={cn("text-xs", config.color, config.bgColor, "border-0")}
        >
          {config.label}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3">
        {completeness.explanation}
      </p>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold">
            {completeness.transactionCoverage.toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Coverage</p>
        </div>
        <div>
          <p className="text-lg font-semibold">
            {completeness.hasIncomeData ? "✓" : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Income</p>
        </div>
        <div>
          <p className="text-lg font-semibold">
            {completeness.hasExpenseData ? "✓" : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Expenses</p>
        </div>
      </div>
      
      {completeness.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {completeness.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
