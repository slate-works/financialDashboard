"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  LineChart,
  TrendingUp,
  Calculator,
  AlertTriangle,
  Target,
  DollarSign,
  Calendar,
  Percent,
  RefreshCw,
  BarChart3,
  ArrowRight,
} from "lucide-react"
import { compareInvestmentScenarios, runSimulation } from "@/lib/analytics-api"
import type { SimulationResult, ScenarioComparison } from "@/types/analytics"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"

const formatCurrency = (value: number | undefined | null) =>
  value != null 
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "$0"

const formatPercent = (value: number | undefined | null) => 
  value != null ? `${value.toFixed(1)}%` : "N/A"

const DISCLAIMER = `This simulator is for educational purposes only and does not constitute financial advice. 
Past performance is not indicative of future results. Actual investment returns may vary significantly 
from simulated projections. Consult a licensed financial advisor before making investment decisions.`

export function InvestmentSimulator() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioComparison | null>(null)

  // Form state
  const [initialValue, setInitialValue] = useState(10000)
  const [monthlyContribution, setMonthlyContribution] = useState(500)
  const [horizonYears, setHorizonYears] = useState(10)
  const [goalAmount, setGoalAmount] = useState<number | undefined>(undefined)

  const runSingleSimulation = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await runSimulation({
        initialValue,
        monthlyContribution,
        horizonMonths: horizonYears * 12,
        goalAmount,
      })
      setResult(data)
    } catch (err) {
      console.error("Simulation error:", err)
      setError("Failed to run simulation")
    } finally {
      setIsLoading(false)
    }
  }, [initialValue, monthlyContribution, horizonYears, goalAmount])

  const runComparison = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await compareInvestmentScenarios({
        initialValue,
        monthlyContribution,
        horizonMonths: horizonYears * 12,
        goalAmount,
      })
      setScenarios(data)
    } catch (err) {
      console.error("Comparison error:", err)
      setError("Failed to compare scenarios")
    } finally {
      setIsLoading(false)
    }
  }, [initialValue, monthlyContribution, horizonYears, goalAmount])

  const totalContributions = initialValue + monthlyContribution * horizonYears * 12

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Educational Simulator</AlertTitle>
        <AlertDescription className="text-xs">{DISCLAIMER}</AlertDescription>
      </Alert>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Investment Parameters
          </CardTitle>
          <CardDescription>Configure your investment scenario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="initial" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Initial Investment
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="initial"
                  type="number"
                  value={initialValue}
                  onChange={(e) => setInitialValue(Number(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Monthly Contribution
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthly"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Time Horizon: {horizonYears} years
              </Label>
              <Slider
                value={[horizonYears]}
                onValueChange={([val]) => setHorizonYears(val)}
                min={1}
                max={40}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Goal Amount (optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="goal"
                  type="number"
                  value={goalAmount || ""}
                  onChange={(e) => setGoalAmount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 500000"
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <Button onClick={runSingleSimulation} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <LineChart className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={runComparison} disabled={isLoading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare Scenarios
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Contributions</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalContributions)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(initialValue)} initial + {formatCurrency(monthlyContribution)}/mo × {horizonYears * 12} months
            </p>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expected Value (Median)</CardDescription>
                <CardTitle className="text-2xl text-emerald-500">
                  {formatCurrency(result.expectedValue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Potential gain: {formatCurrency(result.expectedValue - totalContributions)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Goal Probability
                </CardDescription>
                <CardTitle className={`text-2xl ${(result.probabilityOfSuccess ?? 0) >= 70 ? "text-emerald-500" : (result.probabilityOfSuccess ?? 0) >= 50 ? "text-amber-500" : "text-red-500"}`}>
                  {formatPercent(result.probabilityOfSuccess)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {goalAmount ? `Chance of reaching ${formatCurrency(goalAmount)}` : "Set a goal to see probability"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Results */}
      {(result || scenarios) && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              Based on 1,000 Monte Carlo simulations using historical market returns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={result ? "projection" : "comparison"}>
              <TabsList>
                {result && <TabsTrigger value="projection">Projection</TabsTrigger>}
                {scenarios && <TabsTrigger value="comparison">Scenario Comparison</TabsTrigger>}
                {result && <TabsTrigger value="percentiles">Percentiles</TabsTrigger>}
              </TabsList>

              {result && (
                <TabsContent value="projection" className="mt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={result.projectedPath}>
                        <defs>
                          <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(val) => `Y${Math.floor(val / 12)}`}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Month ${label} (Year ${Math.floor(label / 12)})`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="p90"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={1}
                          fill="none"
                          name="90th Percentile"
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="median"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorMedian)"
                          name="Median"
                        />
                        <Area
                          type="monotone"
                          dataKey="p10"
                          stroke="hsl(var(--chart-4))"
                          strokeWidth={1}
                          fill="none"
                          name="10th Percentile"
                          strokeDasharray="5 5"
                        />
                        {goalAmount && (
                          <ReferenceLine
                            y={goalAmount}
                            stroke="hsl(var(--destructive))"
                            strokeDasharray="3 3"
                            label={{ value: "Goal", fill: "hsl(var(--destructive))", fontSize: 12 }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              )}

              {scenarios && (
                <TabsContent value="comparison" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {(["conservative", "moderate", "aggressive"] as const).map((scenario) => {
                      const data = scenarios[scenario]
                      const color = scenario === "conservative" 
                        ? "text-blue-500" 
                        : scenario === "moderate" 
                        ? "text-emerald-500" 
                        : "text-amber-500"
                      
                      return (
                        <Card key={scenario}>
                          <CardHeader className="pb-2">
                            <CardTitle className={`text-lg capitalize ${color}`}>{scenario}</CardTitle>
                            <CardDescription>
                              {scenario === "conservative" && "Bonds & stable assets"}
                              {scenario === "moderate" && "Balanced portfolio"}
                              {scenario === "aggressive" && "Stocks & growth"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Expected Value</p>
                              <p className="text-2xl font-bold">{formatCurrency(data.expectedValue)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">10th %ile</p>
                                <p className="font-medium">{formatCurrency(data.percentiles.p10)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">90th %ile</p>
                                <p className="font-medium">{formatCurrency(data.percentiles.p90)}</p>
                              </div>
                            </div>
                            {goalAmount && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">Goal Probability</p>
                                <p className={`text-xl font-bold ${(data.probabilityOfSuccess ?? 0) >= 70 ? "text-emerald-500" : (data.probabilityOfSuccess ?? 0) >= 50 ? "text-amber-500" : "text-red-500"}`}>
                                  {formatPercent(data.probabilityOfSuccess)}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              )}

              {result && (
                <TabsContent value="percentiles" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-5">
                    {Object.entries(result.percentiles).map(([key, value]) => (
                      <Card key={key}>
                        <CardHeader className="pb-2">
                          <CardDescription>{key.replace("p", "")}th Percentile</CardDescription>
                          <CardTitle className="text-xl">{formatCurrency(value)}</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    The 50th percentile (median) represents the middle outcome - there's a 50% chance 
                    your actual result will be higher or lower than this value.
                  </p>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
