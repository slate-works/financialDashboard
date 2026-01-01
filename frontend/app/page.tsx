"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { format, subDays } from "date-fns"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GaugeCircle,
  Layers3,
  Loader2,
  PartyPopper,
  Plus,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { DashboardCharts } from "@/components/dashboard-charts"
import { TransactionsTable } from "@/components/transactions-table"
import { UploadDialog } from "@/components/upload-dialog"
import { TransactionFilters } from "@/components/transaction-filters"
import type { Transaction } from "@/types/transaction"
import { generateMockTransactions } from "@/lib/mock-data"
import { getApiUrl } from "@/lib/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type OverviewSummary = {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  budgetAdherence: number
  runwayMonths: number | null
  monthsWithData: number
  transactionCount: number
  averageTransaction: number
  lastTransactionDate: string | null
  topCategories: Array<{ category: string; amount: number; type: string }>
}

type ManualRow = {
  id: string
  date: string
  description: string
  category: string
  amount: string
  type: "income" | "expense" | "transfer"
  account?: string
  note?: string
}

type FilterState = {
  categories: string[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  searchText: string
  month?: string
}

const formatCurrency = (value: number) =>
  `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const newManualRow = (): ManualRow => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `row-${Date.now()}`,
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  category: "",
  amount: "",
  type: "expense",
  account: "",
  note: "",
})

const RANGE_SHORTCUTS = [
  { label: "Last 30 days", key: "30" },
  { label: "Last 90 days", key: "90" },
  { label: "Year to date", key: "ytd" },
  { label: "All time", key: "all" },
]

export default function FinanceDashboard() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [overview, setOverview] = useState<OverviewSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)
  const [importMeta, setImportMeta] = useState<{ lastFile?: string; lastCount?: number; lastImportedAt?: string }>({})
  const [manualRows, setManualRows] = useState<ManualRow[]>([newManualRow(), newManualRow()])
  const [bulkPaste, setBulkPaste] = useState("")
  const [textureIntensity, setTextureIntensity] = useState(8)
  const [accent, setAccent] = useState("#6f7ce3")
  const [density, setDensity] = useState<"comfortable" | "compact" | "ultra">("comfortable")
  const [globalRange, setGlobalRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 90),
    to: new Date(),
  })
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    categories: [],
    dateRange: { from: subDays(new Date(), 90), to: new Date() },
    searchText: "",
    month: undefined,
  })

  const monthsLoaded = useMemo(() => {
    const uniqueMonths = new Set(
      transactions.map((t) => {
        const date = new Date(t.date)
        return `${date.getFullYear()}-${date.getMonth()}`
      }),
    )
    return uniqueMonths.size
  }, [transactions])

  useEffect(() => {
    const opacity = Math.min(0.24, Math.max(0.02, textureIntensity / 100)) * 1.8
    document.documentElement.style.setProperty("--texture-opacity", opacity.toFixed(3))
  }, [textureIntensity])

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", accent)
    document.documentElement.style.setProperty("--ring", accent)
    document.documentElement.style.setProperty("--chart-1", accent)
  }, [accent])

  useEffect(() => {
    const radius =
      density === "comfortable" ? "0.65rem" : density === "compact" ? "0.5rem" : density === "ultra" ? "0.4rem" : "0.65rem"
    document.documentElement.style.setProperty("--radius", radius)
  }, [density])

  useEffect(() => {
    loadTransactions()
    loadOverview()
  }, [])

  const applyFilters = useCallback((filters: FilterState, baseTransactions = transactions) => {
    let filtered = [...baseTransactions]

    if (filters.month) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.date)
        const monthStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        return monthStr === filters.month
      })
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter((t) => filters.categories.includes(t.category))
    }

    const mergedFrom = filters.dateRange.from ?? globalRange.from
    const mergedTo = filters.dateRange.to ?? globalRange.to

    if (mergedFrom) {
      filtered = filtered.filter((t) => new Date(t.date) >= mergedFrom)
    }
    if (mergedTo) {
      filtered = filtered.filter((t) => new Date(t.date) <= mergedTo)
    }

    if (filters.searchText) {
      const search = filters.searchText.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(search) ||
          t.category.toLowerCase().includes(search),
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions, globalRange])

  const handleFilterChange = useCallback((filters: FilterState) => {
    setActiveFilters(filters)
    applyFilters(filters)
  }, [applyFilters])

  const handleRangeShortcut = (key: string) => {
    const now = new Date()
    if (key === "all") {
      setGlobalRange({ from: undefined, to: undefined })
      setActiveFilters((prev) => ({ ...prev, dateRange: { from: undefined, to: undefined } }))
      applyFilters({ ...activeFilters, dateRange: { from: undefined, to: undefined } }, transactions)
      return
    }

    if (key === "ytd") {
      const from = new Date(now.getFullYear(), 0, 1)
      setGlobalRange({ from, to: now })
      setActiveFilters((prev) => ({ ...prev, dateRange: { from, to: now } }))
      applyFilters({ ...activeFilters, dateRange: { from, to: now } }, transactions)
      return
    }

    const days = Number.parseInt(key, 10)
    const from = subDays(now, days)
    setGlobalRange({ from, to: now })
    setActiveFilters((prev) => ({ ...prev, dateRange: { from, to: now } }))
    applyFilters({ ...activeFilters, dateRange: { from, to: now } }, transactions)
  }

  const loadTransactions = async () => {
    try {
      setIsLoading(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions`)
      const data = await response.json()

      if (data.success && data.transactions) {
        setTransactions(data.transactions)
        applyFilters(activeFilters, data.transactions)
      } else {
        throw new Error("No transactions returned")
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      const mock = generateMockTransactions()
      setTransactions(mock)
      applyFilters(activeFilters, mock)
      toast({
        title: "Using sample data",
        description: "Live data could not be loaded. Showing sample transactions instead.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadOverview = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions/summary/overview`)
      const data = await response.json()
      if (data.success) {
        setOverview(data.overview)
      }
    } catch (error) {
      console.error("Error fetching overview:", error)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      if (data.success) {
        setImportMeta({
          lastFile: file.name,
          lastCount: data.count,
          lastImportedAt: new Date().toISOString(),
        })
        toast({
          title: "Import complete",
          description: `${data.count} transactions added from ${file.name}`,
        })
        await loadTransactions()
        await loadOverview()
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: "Please try again with a valid CSV file.",
        variant: "destructive",
      })
    }
  }

  const handleDataCleared = () => {
    setTransactions([])
    setFilteredTransactions([])
    setOverview(null)
  }

  const handleManualRowChange = (id: string, field: keyof ManualRow, value: string) => {
    setManualRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  const handleAddManualRow = () => {
    setManualRows((prev) => [...prev, newManualRow()])
  }

  const handleRemoveRow = (id: string) => {
    setManualRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  const handleCommitManual = async () => {
    const payload = manualRows
      .filter((row) => row.description || row.amount)
      .map((row) => ({
        date: row.date || format(new Date(), "yyyy-MM-dd"),
        description: row.description || "Manual entry",
        category: row.category || "Uncategorized",
        amount: Number.parseFloat(row.amount || "0"),
        type: row.type,
        account: row.account || null,
        note: row.note || null,
      }))

    if (payload.length === 0) {
      toast({
        title: "Nothing to add",
        description: "Enter at least one row or paste data before committing.",
      })
      return
    }

    setIsSubmittingManual(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Manual entry failed")
      }

      const data = await response.json()
      toast({
        title: "Manual entries saved",
        description: `${data.count ?? payload.length} rows added`,
      })
      setManualRows([newManualRow()])
      setBulkPaste("")
      await loadTransactions()
      await loadOverview()
    } catch (error) {
      console.error("Error saving manual rows:", error)
      toast({
        title: "Could not save rows",
        description: "Please check your values and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingManual(false)
    }
  }

  const handleBulkPaste = () => {
    if (!bulkPaste.trim()) {
      toast({
        title: "Paste some rows",
        description: "Use comma or tab separated values: date, description, category, amount, type",
      })
      return
    }

    const lines = bulkPaste
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const parsed = lines.map((line) => {
      const cells = line.split(/\t|,/).map((cell) => cell.trim())
      return {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `paste-${Date.now()}`,
        date: cells[0] || format(new Date(), "yyyy-MM-dd"),
        description: cells[1] || "Pasted item",
        category: cells[2] || "Uncategorized",
        amount: cells[3] || "0",
        type: (cells[4] as ManualRow["type"]) || "expense",
        account: "",
        note: "",
      } as ManualRow
    })

    setManualRows((prev) => [...prev, ...parsed])
    toast({
      title: "Rows staged",
      description: `${parsed.length} pasted rows added to the queue`,
    })
  }

  const handleUseSampleData = () => {
    const mock = generateMockTransactions()
    setTransactions(mock)
    applyFilters(activeFilters, mock)
    setOverview(null)
    toast({
      title: "Sample data loaded",
      description: "You're viewing the demo layout with mock transactions.",
    })
  }

  const thisMonth = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()
    const monthTransactions = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income = monthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expenses = monthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, expenses, net: income - expenses }
  }, [transactions])

  return (
    <div className="relative min-h-screen bg-background/90 text-foreground">
      <div className="texture-overlay" aria-hidden />
      <DashboardHeader
        monthsLoaded={monthsLoaded}
        onDataCleared={handleDataCleared}
        onSearchChange={(searchText) => handleFilterChange({ ...activeFilters, searchText })}
      />

      <main className="relative mx-auto max-w-7xl space-y-10 px-6 py-8" id="dashboard">
        <section className="glass-card p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Calm clarity mode
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Financial overview at a glance</h2>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  A tactile, bento-inspired workspace for budgets, transactions, and insights. Use the range shortcuts to
                  adjust the global context—tiles honor it by default.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {RANGE_SHORTCUTS.map((shortcut) => (
                  <Button
                    key={shortcut.key}
                    variant={globalRange.from === undefined && shortcut.key === "all" ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleRangeShortcut(shortcut.key)}
                  >
                    {shortcut.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <UploadDialog onFileUpload={handleFileUpload} />
              <Button variant="outline" className="gap-2" onClick={handleUseSampleData}>
                <Layers3 className="h-4 w-4" />
                Load sample data
              </Button>
              <Button variant="default" className="gap-2" onClick={handleCommitManual} disabled={isSubmittingManual}>
                {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Commit staged rows
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">This month net</CardTitle>
                <CardDescription className="text-xs">Income vs. expenses</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">{formatCurrency(thisMonth.net)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(thisMonth.income)} in / {formatCurrency(thisMonth.expenses)} out
                  </p>
                </div>
                <GaugeCircle className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Savings rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-semibold">
                    {overview ? `${overview.savingsRate.toFixed(1)}%` : "—"}
                  </p>
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <Progress value={Math.min(100, Math.max(0, overview?.savingsRate ?? 0))} className="mt-3" />
                <p className="mt-1 text-xs text-muted-foreground">Goal: 15–30% monthly</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Budget adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-semibold">
                    {overview ? `${overview.budgetAdherence.toFixed(0)}%` : "—"}
                  </p>
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <Progress value={Math.min(120, overview?.budgetAdherence ?? 0)} className="mt-3" />
                <p className="mt-1 text-xs text-muted-foreground">85% spend target baseline</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Latest activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span>
                    {overview?.lastTransactionDate
                      ? format(new Date(overview.lastTransactionDate), "MMM dd, yyyy")
                      : "Awaiting data"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers3 className="h-4 w-4" />
                  <span>{transactions.length} total transactions</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4" id="overview">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Key performance tiles</h3>
              <p className="text-sm text-muted-foreground">
                Net flow, savings, budgets, and dataset coverage updated in real time.
              </p>
            </div>
          </div>
          <DashboardStats transactions={filteredTransactions} overview={overview} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" id="data">
          <Card className="bento-surface lg:col-span-5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>This month at a glance</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Guided
                </Badge>
              </div>
              <CardDescription>Cash flow, top categories, and mini narrative</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Net this month</p>
                  <p className="text-2xl font-semibold">{formatCurrency(thisMonth.net)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Top category</p>
                  <p className="text-sm font-semibold">
                    {overview?.topCategories?.[0]?.category ?? "Pending data"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border/60 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Story
                </p>
                <p className="text-sm">
                  {thisMonth.net >= 0
                    ? "Spending is on track. Consider increasing savings by 2-3%."
                    : "Expenses exceed income this month. Review dining and subscriptions."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle>Top spending categories</CardTitle>
              <CardDescription>Live distribution with gentle gradients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview?.topCategories ?? []).slice(0, 4).map((cat) => (
                <div key={`${cat.category}-${cat.type}`} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">{cat.category}</p>
                      <p className="text-xs text-muted-foreground">{cat.type}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(cat.amount)}</p>
                </div>
              ))}
              {!overview?.topCategories?.length && (
                <p className="text-sm text-muted-foreground">Upload or add data to see category leaders.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bento-surface bento-gradient text-foreground lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>Upcoming bills & subscriptions</CardTitle>
              <CardDescription className="text-foreground/80">
                Gentle reminders across the horizon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Internet & utilities", date: "12th", amount: 145 },
                { name: "Streaming bundle", date: "15th", amount: 38 },
                { name: "Workspace tools", date: "22nd", amount: 59 },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-white/30 p-3 text-sm shadow-sm backdrop-blur">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Due {item.date}</p>
                  </div>
                  <p className="text-sm font-semibold">${item.amount}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle>Budget vs. actual</CardTitle>
              <CardDescription>Toggle periods and watch smooth fills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="monthly">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Annual</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget adherence</span>
                  <span className="font-semibold">{overview ? `${overview.budgetAdherence.toFixed(0)}%` : "—"}</span>
                </div>
                <Progress value={Math.min(120, overview?.budgetAdherence ?? 0)} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5" />
                Adjust thresholds in Settings → Budgets
              </div>
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Mini table with quick context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTransactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.date), "MMM dd")} • {t.category}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(Math.abs(t.amount))}
                  </p>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-sm text-muted-foreground">No transactions in the current view.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>Alerts & milestones</CardTitle>
              <CardDescription>Confetti-worthy micro moments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                <div>
                  <p className="text-sm font-semibold">Dining down 12%</p>
                  <p className="text-xs text-muted-foreground">Versus last month</p>
                </div>
                <Badge variant="secondary">Good job</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50/80 p-3">
                <div>
                  <p className="text-sm font-semibold">Subscriptions review</p>
                  <p className="text-xs text-muted-foreground">3 items flagged for review</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Celebrate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>Manual entry quick add</CardTitle>
              <CardDescription>Inline capture with batch handoff</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground">
                <span className="col-span-2">Description</span>
                <span>Category</span>
                <span>Type</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                <Input
                  className="col-span-2"
                  placeholder="Quick description"
                  value={manualRows[0]?.description ?? ""}
                  onChange={(e) => handleManualRowChange(manualRows[0].id, "description", e.target.value)}
                />
                <Input
                  placeholder="Category"
                  value={manualRows[0]?.category ?? ""}
                  onChange={(e) => handleManualRowChange(manualRows[0].id, "category", e.target.value)}
                />
                <Select
                  value={manualRows[0]?.type}
                  onValueChange={(value: ManualRow["type"]) =>
                    handleManualRowChange(manualRows[0].id, "type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-2 text-right"
                  placeholder="0.00"
                  value={manualRows[0]?.amount ?? ""}
                  onChange={(e) => handleManualRowChange(manualRows[0].id, "amount", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Staged rows: {manualRows.length}</span>
                <Button size="sm" variant="ghost" className="gap-1" onClick={handleAddManualRow}>
                  <Plus className="h-3.5 w-3.5" /> Add row
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-surface lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>CSV import status</CardTitle>
              <CardDescription>Statuses, retries, and last run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 p-3">
                <div>
                  <p className="text-sm font-semibold">{importMeta.lastFile ?? "Awaiting file"}</p>
                  <p className="text-xs text-muted-foreground">
                    {importMeta.lastImportedAt
                      ? `Imported ${importMeta.lastCount ?? 0} rows`
                      : "Use Upload to ingest a CSV or XLSX"}
                  </p>
                </div>
                <UploadCloud className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Deduplication and validation applied automatically
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4" id="insights">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Insights & trends</h3>
              <p className="text-sm text-muted-foreground">Charts honor the global date range and filters.</p>
            </div>
          </div>
          <DashboardCharts transactions={filteredTransactions} />
        </section>

        <section className="space-y-4" id="transactions">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Transactions</h3>
              <p className="text-sm text-muted-foreground">
                Keyboard-friendly filters, sticky headers, and bulk ready tables.
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleUseSampleData}>
              <Download className="h-4 w-4" />
              Export view (CSV)
            </Button>
          </div>
          <TransactionFilters
            transactions={transactions}
            onFilterChange={handleFilterChange}
            initialDateRange={globalRange}
          />
          <TransactionsTable transactions={filteredTransactions} />
        </section>

        <section className="space-y-4" id="data-entry">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Manual entry workspace</h3>
            <p className="text-sm text-muted-foreground">
              Batch-friendly grid with paste support and inline validation cues.
            </p>
          </div>

          <Tabs defaultValue="grid" className="w-full">
            <TabsList>
              <TabsTrigger value="grid">Grid entry</TabsTrigger>
              <TabsTrigger value="paste">Bulk paste</TabsTrigger>
            </TabsList>
            <TabsContent value="grid" className="mt-4">
              <div className="glass-card p-4 space-y-3">
                <div className="grid grid-cols-12 gap-3 text-xs text-muted-foreground">
                  <span className="col-span-2">Date</span>
                  <span className="col-span-3">Description</span>
                  <span className="col-span-2">Category</span>
                  <span>Type</span>
                  <span className="col-span-2">Account</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {manualRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 items-center gap-3">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleManualRowChange(row.id, "date", e.target.value)}
                      className="col-span-2"
                    />
                    <Input
                      value={row.description}
                      placeholder="e.g., Coffee shop"
                      onChange={(e) => handleManualRowChange(row.id, "description", e.target.value)}
                      className="col-span-3"
                    />
                    <Input
                      value={row.category}
                      placeholder="Category"
                      onChange={(e) => handleManualRowChange(row.id, "category", e.target.value)}
                      className="col-span-2"
                    />
                    <Select value={row.type} onValueChange={(value: ManualRow["type"]) => handleManualRowChange(row.id, "type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.account}
                      placeholder="Account"
                      onChange={(e) => handleManualRowChange(row.id, "account", e.target.value)}
                      className="col-span-2"
                    />
                    <div className="col-span-2 flex items-center gap-2">
                      <Input
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) => handleManualRowChange(row.id, "amount", e.target.value)}
                        className="text-right"
                        placeholder="0.00"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)} className="h-9 w-9">
                        <span className="sr-only">Remove row</span>
                        <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{manualRows.length} rows staged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleAddManualRow} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add row
                    </Button>
                    <Button size="sm" className="gap-1" onClick={handleCommitManual} disabled={isSubmittingManual}>
                      {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Commit batch
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="paste" className="mt-4">
              <div className="glass-card p-4 space-y-3">
                <Label className="text-sm font-medium">Bulk paste (CSV or tab-delimited)</Label>
                <Textarea
                  rows={6}
                  placeholder="2025-03-04,Groceries,Food & Dining,54.22,expense"
                  value={bulkPaste}
                  onChange={(e) => setBulkPaste(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Fields: date, description, category, amount, type. We auto-stage them in the grid.
                  </p>
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleBulkPaste}>
                    <ArrowRight className="h-3.5 w-3.5" /> Preview & stage
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4" id="customization">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Theme, textures, and motion</h3>
            <p className="text-sm text-muted-foreground">
              Adjust accent, density, and grain. Reduced motion is available in the header toggle.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Accent color</CardTitle>
                <CardDescription>Brand the workspace with a soft hue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 w-16 rounded-md border border-border bg-transparent p-1"
                  />
                  <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Texture intensity</CardTitle>
                <CardDescription>Paper grain and gradients, tuned to taste.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Texture</span>
                  <span className="text-muted-foreground">{textureIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={textureIntensity}
                  onChange={(e) => setTextureIntensity(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Density</CardTitle>
                <CardDescription>Comfortable, compact, or ultra.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {(["comfortable", "compact", "ultra"] as const).map((option) => (
                    <Button
                      key={option}
                      variant={density === option ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      onClick={() => setDensity(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PartyPopper className="h-4 w-4" />
                  Layout updates live without page reload.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

