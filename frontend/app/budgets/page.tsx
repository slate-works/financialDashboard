"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Plus, Trash2, Info, RefreshCw, Lightbulb } from "lucide-react"
import { getApiUrl } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Budget {
  id: number
  category: string
  amount: number
  period: string
}

interface BudgetVarianceResult {
  category: string
  budgeted: number
  actual: number
  variance: number
  varianceAmount: number
  status: "On Track" | "Over Budget" | "Under Budget"
  isRedFlag: boolean
}

interface MonthlyBudgetReport {
  month: string
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  surplus: number
  categories: BudgetVarianceResult[]
  redFlagCount: number
}

interface BudgetSuggestion {
  category: string
  suggested: number
  confidence: "low" | "medium" | "high"
  note: string
}

export default function BudgetsPage() {
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [varianceReport, setVarianceReport] = useState<MonthlyBudgetReport | null>(null)
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newBudget, setNewBudget] = useState({ category: "", amount: "" })

  const loadBudgets = useCallback(async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/budgets`)
      const data = await response.json()
      setBudgets(data)
    } catch (error) {
      console.error("Error loading budgets:", error)
    }
  }, [])

  const loadVarianceReport = useCallback(async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/budgets/variance`)
      const data = await response.json()
      setVarianceReport(data)
    } catch (error) {
      console.error("Error loading variance report:", error)
    }
  }, [])

  const loadSuggestions = useCallback(async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/budgets/suggestions`)
      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error("Error loading suggestions:", error)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([loadBudgets(), loadVarianceReport(), loadSuggestions()])
    setIsLoading(false)
  }, [loadBudgets, loadVarianceReport, loadSuggestions])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.amount) {
      toast({ title: "Missing fields", description: "Please enter category and amount.", variant: "destructive" })
      return
    }

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newBudget.category,
          amount: parseFloat(newBudget.amount),
        }),
      })

      if (!response.ok) throw new Error("Failed to save budget")

      toast({ title: "Budget saved", description: `Budget for ${newBudget.category} set to $${newBudget.amount}` })
      setNewBudget({ category: "", amount: "" })
      setIsDialogOpen(false)
      await loadAll()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save budget.", variant: "destructive" })
    }
  }

  const handleDeleteBudget = async (id: number) => {
    try {
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/budgets/${id}`, { method: "DELETE" })
      toast({ title: "Budget deleted" })
      await loadAll()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete budget.", variant: "destructive" })
    }
  }

  const handleApplySuggestion = async (suggestion: BudgetSuggestion) => {
    try {
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: suggestion.category,
          amount: suggestion.suggested,
        }),
      })
      toast({ title: "Suggestion applied", description: `Budget for ${suggestion.category} set to $${suggestion.suggested}` })
      await loadAll()
    } catch (error) {
      toast({ title: "Error", description: "Failed to apply suggestion.", variant: "destructive" })
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "On Track":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case "Over Budget":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "Under Budget":
        return <TrendingDown className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getProgressColor = (variance: number, isRedFlag: boolean) => {
    if (isRedFlag) return "bg-red-500"
    if (variance > 0) return "bg-amber-500"
    if (variance < -20) return "bg-blue-500"
    return "bg-emerald-500"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <PageHeader
          title="Budget vs. Actual"
          description="Track your spending against category budgets"
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Budgeted</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(varianceReport?.totalBudgeted || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Spent</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(varianceReport?.totalActual || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month Surplus/Deficit</CardDescription>
              <CardTitle className={cn("text-2xl", (varianceReport?.surplus || 0) < 0 ? "text-red-500" : "text-emerald-500")}>
                {formatCurrency(varianceReport?.surplus || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Red Flags</CardDescription>
              <CardTitle className={cn("text-2xl flex items-center gap-2", (varianceReport?.redFlagCount || 0) > 0 && "text-red-500")}>
                {varianceReport?.redFlagCount || 0}
                {(varianceReport?.redFlagCount || 0) > 0 && <AlertTriangle className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Variance Report */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Category Budgets</CardTitle>
              <CardDescription>
                {varianceReport?.month || "Current Month"} spending by category
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-medium">Budget Variance Formula</p>
                    <p className="text-sm">Variance = (Actual − Budget) / Budget × 100%</p>
                    <p className="text-sm mt-1">Red flag threshold: &gt;20% over budget</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category Budget</DialogTitle>
                  <DialogDescription>Set a monthly spending limit for a category</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newBudget.category}
                      onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                      placeholder="e.g., Groceries"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Monthly Budget</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newBudget.amount}
                      onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                      placeholder="400"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddBudget}>Save Budget</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {varianceReport?.categories && varianceReport.categories.length > 0 ? (
              <div className="space-y-4">
                {varianceReport.categories.map((cat) => {
                  const progressPercent = cat.budgeted > 0 ? Math.min(100, (cat.actual / cat.budgeted) * 100) : 0
                  const budget = budgets.find((b) => b.category === cat.category)

                  return (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cat.status)}
                          <span className="font-medium">{cat.category}</span>
                          {cat.isRedFlag && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {cat.variance.toFixed(0)}% over
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatCurrency(cat.actual)} / {formatCurrency(cat.budgeted)}</span>
                          {budget && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteBudget(budget.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={progressPercent} className="h-2" />
                        <div
                          className={cn("absolute top-0 h-2 rounded-full transition-all", getProgressColor(cat.variance, cat.isRedFlag))}
                          style={{ width: `${Math.min(100, progressPercent)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No budgets configured yet.</p>
                <p className="text-sm mt-1">Add category budgets or apply suggestions below.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Smart Budget Suggestions
              </CardTitle>
              <CardDescription>Based on your spending history, here are recommended budgets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {suggestions
                  .filter((s) => s.suggested > 0 && !budgets.some((b) => b.category === s.category))
                  .slice(0, 6)
                  .map((suggestion) => (
                    <Card key={suggestion.category} className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{suggestion.category}</p>
                            <p className="text-2xl font-bold">{formatCurrency(suggestion.suggested)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{suggestion.note}</p>
                          </div>
                          <Badge variant={suggestion.confidence === "high" ? "default" : suggestion.confidence === "medium" ? "secondary" : "outline"}>
                            {suggestion.confidence}
                          </Badge>
                        </div>
                        <Button size="sm" className="w-full mt-3" variant="secondary" onClick={() => handleApplySuggestion(suggestion)}>
                          Apply Suggestion
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
