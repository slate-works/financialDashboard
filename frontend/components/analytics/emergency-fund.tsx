"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  Calculator,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Info,
  RefreshCw,
  Wallet,
  Clock,
  Users,
  Heart,
  Briefcase,
} from "lucide-react"
import { quickEmergencyAssessment, calculateEmergencyFund } from "@/lib/analytics-api"
import type { EmergencyFundAnalysis } from "@/types/analytics"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const getStatusConfig = (status: string) => {
  switch (status) {
    case "above_target":
      return {
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        icon: CheckCircle,
        label: "Excellent",
      }
    case "adequate":
      return {
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        icon: Shield,
        label: "Adequate",
      }
    case "below_target":
    default:
      return {
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        icon: AlertTriangle,
        label: "Below Target",
      }
  }
}

export function EmergencyFundCalculator() {
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<EmergencyFundAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [currentSavings, setCurrentSavings] = useState<number>(5000)
  const [incomeStability, setIncomeStability] = useState<string>("stable")
  const [dependents, setDependents] = useState<number>(0)
  const [healthRisk, setHealthRisk] = useState<string>("normal")
  const [jobStabilityYears, setJobStabilityYears] = useState<number>(2)
  const [hasPartnerIncome, setHasPartnerIncome] = useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const runQuickAssessment = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await quickEmergencyAssessment(currentSavings, incomeStability === "variable")
      setAnalysis(result)
    } catch (err) {
      console.error("Error calculating emergency fund:", err)
      setError("Failed to calculate emergency fund recommendation")
    } finally {
      setIsLoading(false)
    }
  }, [currentSavings, incomeStability])

  const runDetailedAnalysis = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await calculateEmergencyFund({
        incomeStability,
        dependents,
        healthRisk,
        jobStabilityYears,
        hasPartnerIncome,
        currentBalance: currentSavings,
      })
      setAnalysis(result)
    } catch (err) {
      console.error("Error calculating emergency fund:", err)
      setError("Failed to calculate emergency fund recommendation")
    } finally {
      setIsLoading(false)
    }
  }, [currentSavings, incomeStability, dependents, healthRisk, jobStabilityYears, hasPartnerIncome])

  const statusConfig = analysis ? getStatusConfig(analysis.status) : null
  const StatusIcon = statusConfig?.icon || Shield
  const progressPercent = analysis
    ? Math.min(100, (analysis.currentBalance / analysis.recommendedAmount) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Calculator Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Emergency Fund Calculator
          </CardTitle>
          <CardDescription>
            Calculate your personalized emergency fund target based on your situation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Input */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="savings">Current Emergency Savings</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="savings"
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(Number(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stability">Income Stability</Label>
                <Select value={incomeStability} onValueChange={setIncomeStability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Stable (Regular salary)</SelectItem>
                    <SelectItem value="variable">Variable (Freelance/Commission)</SelectItem>
                    <SelectItem value="high_variable">Highly Variable (Seasonal/Gig)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={runQuickAssessment} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Quick Assessment
                  </>
                )}
              </Button>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Advanced Options</Label>
                <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
              </div>

              {showAdvanced && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Dependents
                    </Label>
                    <Slider
                      value={[dependents]}
                      onValueChange={([val]) => setDependents(val)}
                      max={5}
                      step={1}
                    />
                    <span className="text-sm text-muted-foreground">{dependents} dependents</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Health Risk
                    </Label>
                    <Select value={healthRisk} onValueChange={setHealthRisk}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="elevated">Elevated</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Years at Current Job
                    </Label>
                    <Slider
                      value={[jobStabilityYears]}
                      onValueChange={([val]) => setJobStabilityYears(val)}
                      max={20}
                      step={1}
                    />
                    <span className="text-sm text-muted-foreground">{jobStabilityYears} years</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="partner">Partner has income</Label>
                    <Switch
                      id="partner"
                      checked={hasPartnerIncome}
                      onCheckedChange={setHasPartnerIncome}
                    />
                  </div>

                  <Button onClick={runDetailedAnalysis} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Detailed Analysis
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {analysis && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${statusConfig?.color}`} />
                  Your Status
                </CardTitle>
                <Badge className={`${statusConfig?.bgColor} ${statusConfig?.color}`}>
                  {statusConfig?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Current Savings</p>
                <p className="text-4xl font-bold">{formatCurrency(analysis.currentBalance)}</p>
                <p className="text-sm text-muted-foreground">
                  of {formatCurrency(analysis.recommendedAmount)} target
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className={statusConfig?.color}>{progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {analysis.statusExplanation}
              </p>
            </CardContent>
          </Card>

          {/* Recommendation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{analysis.recommendedMonths}</p>
                  <p className="text-xs text-muted-foreground">Months Coverage</p>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <Wallet className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatCurrency(analysis.monthlyEssentialExpenses)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Essentials</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Target Amount</h4>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(analysis.recommendedAmount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysis.recommendedMonths} months × {formatCurrency(analysis.monthlyEssentialExpenses)}
                </p>
              </div>

              {analysis.currentBalance < analysis.recommendedAmount && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <h4 className="font-medium text-amber-500 mb-1">Gap to Target</h4>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analysis.recommendedAmount - analysis.currentBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save {formatCurrency((analysis.recommendedAmount - analysis.currentBalance) / 12)}/month to reach in 1 year
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Guidelines Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Emergency Fund Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Stable Income</h4>
              <p className="text-xs text-muted-foreground">
                Regular salary, dual income households typically need 3-4 months of expenses.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Variable Income</h4>
              <p className="text-xs text-muted-foreground">
                Freelancers, commission-based, or single income need 6-9 months of expenses.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">High Risk</h4>
              <p className="text-xs text-muted-foreground">
                Seasonal work, health issues, or job instability may require 9-12+ months.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
