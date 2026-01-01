"use client"

import { useState, useMemo, useCallback } from "react"
import { format, subDays } from "date-fns"
import {
  Search,
  Filter,
  X,
  CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Download,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useData } from "@/lib/data-context"
import { formatCurrency, formatDate, fixTextEncoding } from "@/lib/format"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "@/types/transaction"

const RANGE_SHORTCUTS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Year to date", key: "ytd" },
  { label: "All time", key: "all" },
]

export default function TransactionsPage() {
  const { transactions, isLoading } = useData()
  const { toast } = useToast()
  
  // Filter state
  const [searchText, setSearchText] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 90),
    to: new Date(),
  })
  const [displayCount, setDisplayCount] = useState(20)

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.category))).sort()
  }, [transactions])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(search) ||
          t.category.toLowerCase().includes(search)
      )
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((t) => selectedCategories.includes(t.category))
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter((t) => new Date(t.date) >= dateRange.from!)
    }
    if (dateRange.to) {
      filtered = filtered.filter((t) => new Date(t.date) <= dateRange.to!)
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [transactions, searchText, selectedCategories, dateRange])

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, expenses, net: income - expenses }
  }, [filteredTransactions])

  const displayedTransactions = filteredTransactions.slice(0, displayCount)
  const hasMore = filteredTransactions.length > displayCount

  const handleRangeShortcut = (shortcut: typeof RANGE_SHORTCUTS[number]) => {
    if ("key" in shortcut) {
      if (shortcut.key === "all") {
        setDateRange({ from: undefined, to: undefined })
      } else if (shortcut.key === "ytd") {
        const now = new Date()
        setDateRange({ from: new Date(now.getFullYear(), 0, 1), to: now })
      }
    } else {
      setDateRange({ from: subDays(new Date(), shortcut.days), to: new Date() })
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const clearFilters = () => {
    setSearchText("")
    setSelectedCategories([])
    setDateRange({ from: subDays(new Date(), 90), to: new Date() })
  }

  const hasActiveFilters =
    searchText || selectedCategories.length > 0 || !dateRange.from || !dateRange.to

  const handleExport = useCallback(() => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No transactions match your current filters.",
      })
      return
    }

    const headers = ["Date", "Description", "Category", "Type", "Amount"]
    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map((t) =>
        [
          t.date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.category,
          t.type,
          t.amount,
        ].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export complete",
      description: `${filteredTransactions.length} transactions exported to CSV.`,
    })
  }, [filteredTransactions, toast])

  if (isLoading) {
    return <TransactionsSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={`${filteredTransactions.length} transactions found`}
      >
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Income</p>
            <p className="text-lg font-semibold text-success sm:text-xl tabular-nums">
              +{formatCurrency(totals.income)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Expenses</p>
            <p className="text-lg font-semibold text-destructive sm:text-xl tabular-nums">
              -{formatCurrency(totals.expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Net</p>
            <p
              className={`text-lg font-semibold sm:text-xl tabular-nums ${
                totals.net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {totals.net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totals.net))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date Range Shortcuts */}
          <div className="flex flex-wrap gap-2">
            {RANGE_SHORTCUTS.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="outline"
                size="sm"
                onClick={() => handleRangeShortcut(shortcut)}
                className="text-xs"
              >
                {shortcut.label}
              </Button>
            ))}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="size-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} -{" "}
                        {format(dateRange.to, "MMM dd")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    "Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) =>
                    setDateRange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Category Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="size-4" />
                  Categories
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <p className="mb-3 text-sm font-medium">Filter by Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={
                        selectedCategories.includes(category)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2 text-muted-foreground"
              >
                <X className="size-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Category Tags */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge key={category} variant="secondary" className="gap-1 pr-1">
                  {category}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {displayedTransactions.length} of {filteredTransactions.length}{" "}
            transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="space-y-2 lg:hidden">
            {displayedTransactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions match your filters.
              </p>
            ) : (
              displayedTransactions.map((t) => (
                <TransactionCard key={t.id} transaction={t} />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden rounded-lg border lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No transactions match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        {formatDate(t.date, "short")}
                      </TableCell>
                      <TableCell className="font-medium">{fixTextEncoding(t.description)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {fixTextEncoding(t.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {t.type === "income" ? (
                            <>
                              <ArrowUpRight className="size-4 text-success" />
                              <span className="text-sm text-success">Income</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="size-4 text-destructive" />
                              <span className="text-sm text-destructive">Expense</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span
                          className={
                            t.type === "income" ? "text-success" : "text-destructive"
                          }
                        >
                          {t.type === "income" ? "+" : "-"}
                          {formatCurrency(Math.abs(t.amount))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setDisplayCount((prev) => prev + 20)}
                className="gap-2"
              >
                <ChevronDown className="size-4" />
                Show more ({filteredTransactions.length - displayCount} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const t = transaction
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fixTextEncoding(t.description)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(t.date, "short")}</span>
          <span>•</span>
          <Badge variant="outline" className="text-xs font-normal">
            {fixTextEncoding(t.category)}
          </Badge>
        </div>
      </div>
      <div className="ml-4 text-right">
        <p
          className={`font-semibold tabular-nums ${
            t.type === "income" ? "text-success" : "text-destructive"
          }`}
        >
          {t.type === "income" ? "+" : "-"}
          {formatCurrency(Math.abs(t.amount))}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-xs">
          {t.type === "income" ? (
            <>
              <ArrowUpRight className="size-3 text-success" />
              <span className="text-success">Income</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="size-3 text-destructive" />
              <span className="text-destructive">Expense</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
