"use client"

import { useState, useCallback, useMemo } from "react"
import { format } from "date-fns"
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  ClipboardPaste,
  ArrowRight,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useData } from "@/lib/data-context"
import { createId } from "@/lib/id"
import { useToast } from "@/hooks/use-toast"

type ManualRow = {
  id: string
  date: string
  description: string
  category: string
  amount: string
  type: "income" | "expense" | "transfer"
  account: string
  note: string
}

// Categories organized by type
const EXPENSE_CATEGORIES = [
  "Fast Food / Eating Out",
  "Social Life",
  "Pets",
  "Transport",
  "Culture",
  "Household",
  "Apparel",
  "Beauty",
  "Health",
  "Education",
  "Gift",
  "Bills",
  "Entertainment",
  "Groceries",
  "Subscriptions",
  "Uncategorized",
]

const INCOME_CATEGORIES = [
  "Paycheck",
  "Salary",
  "Freelance",
  "Investment",
  "Refund",
  "Gift Received",
  "Bonus",
  "Other Income",
]

const TRANSFER_CATEGORIES = [
  "Transfer",
  "Account Transfer",
  "Savings",
  "Investment Transfer",
]

function createEmptyRow(): ManualRow {
  return {
    id: createId("row"),
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    category: "",
    amount: "",
    type: "expense",
    account: "",
    note: "",
  }
}

export default function ManualEntryPage() {
  const { submitManualEntries, transactions } = useData()
  const { toast } = useToast()
  
  // Get unique categories from existing transactions, organized by likely type
  const transactionCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category).filter(Boolean))
    return Array.from(cats)
  }, [transactions])
  
  // Function to get categories filtered by type
  const getCategoriesForType = useCallback((type: "income" | "expense" | "transfer") => {
    let baseCategories: string[]
    
    switch (type) {
      case "income":
        baseCategories = INCOME_CATEGORIES
        break
      case "transfer":
        baseCategories = TRANSFER_CATEGORIES
        break
      case "expense":
      default:
        baseCategories = EXPENSE_CATEGORIES
        break
    }
    
    // Include transaction categories that match this type pattern
    const dynamicCats = transactionCategories.filter(cat => {
      const lowerCat = cat.toLowerCase()
      if (type === "income") {
        return lowerCat.includes("income") || lowerCat.includes("salary") || 
               lowerCat.includes("paycheck") || lowerCat.includes("refund")
      }
      if (type === "transfer") {
        return lowerCat.includes("transfer") || lowerCat.includes("savings")
      }
      // For expense, include everything not clearly income/transfer
      return !lowerCat.includes("income") && !lowerCat.includes("salary") && 
             !lowerCat.includes("paycheck") && !lowerCat.includes("transfer")
    })
    
    // Merge and dedupe
    return Array.from(new Set([...baseCategories, ...dynamicCats])).sort()
  }, [transactionCategories])

  const [rows, setRows] = useState<ManualRow[]>([createEmptyRow()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkPaste, setBulkPaste] = useState("")

  // Quick entry state (simplified single entry)
  const [quickEntry, setQuickEntry] = useState<ManualRow>(createEmptyRow())

  const handleRowChange = useCallback((id: string, field: keyof ManualRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }, [])

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  const handleRemoveRow = (id: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  const handleSubmitRows = async () => {
    const validRows = rows.filter((row) => row.description && row.amount)
    
    if (validRows.length === 0) {
      toast({
        title: "Nothing to submit",
        description: "Please fill in at least one entry with description and amount.",
      })
      return
    }

    setIsSubmitting(true)
    
    const entries = validRows.map((row) => ({
      date: row.date || format(new Date(), "yyyy-MM-dd"),
      description: row.description,
      category: row.category || "Uncategorized",
      amount: parseFloat(row.amount) || 0,
      type: row.type,
      account: row.account || null,
      note: row.note || null,
    }))

    const success = await submitManualEntries(entries)
    
    if (success) {
      setRows([createEmptyRow()])
    }
    
    setIsSubmitting(false)
  }

  const handleQuickSubmit = async () => {
    if (!quickEntry.description || !quickEntry.amount) {
      toast({
        title: "Missing information",
        description: "Please enter a description and amount.",
      })
      return
    }

    setIsSubmitting(true)
    
    const entry = {
      date: quickEntry.date || format(new Date(), "yyyy-MM-dd"),
      description: quickEntry.description,
      category: quickEntry.category || "Uncategorized",
      amount: parseFloat(quickEntry.amount) || 0,
      type: quickEntry.type,
      account: quickEntry.account || null,
      note: quickEntry.note || null,
    }

    const success = await submitManualEntries([entry])
    
    if (success) {
      setQuickEntry(createEmptyRow())
    }
    
    setIsSubmitting(false)
  }

  const handleBulkParse = () => {
    if (!bulkPaste.trim()) {
      toast({
        title: "No data to parse",
        description: "Paste some data in the format: date, description, category, amount, type",
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
        id: createId("paste"),
        date: cells[0] || format(new Date(), "yyyy-MM-dd"),
        description: cells[1] || "Pasted item",
        category: cells[2] || "Uncategorized",
        amount: cells[3] || "0",
        type: (cells[4] as ManualRow["type"]) || "expense",
        account: "",
        note: "",
      } as ManualRow
    })

    setRows((prev) => [...prev, ...parsed])
    setBulkPaste("")
    
    toast({
      title: "Data parsed",
      description: `${parsed.length} rows added. Review and submit when ready.`,
    })
  }

  const validRowCount = rows.filter((row) => row.description && row.amount).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Entry"
        description="Add transactions manually or paste from spreadsheet"
      />

      <Tabs defaultValue="quick" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="quick">Quick Add</TabsTrigger>
          <TabsTrigger value="batch">Batch Entry</TabsTrigger>
          <TabsTrigger value="paste">Bulk Paste</TabsTrigger>
        </TabsList>

        {/* Quick Add Tab */}
        <TabsContent value="quick" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Add Transaction</CardTitle>
              <CardDescription>
                Add a single transaction quickly with minimal fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-description">Description</Label>
                  <Input
                    id="quick-description"
                    placeholder="e.g., Coffee at Starbucks"
                    value={quickEntry.description}
                    onChange={(e) =>
                      setQuickEntry((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-amount">Amount</Label>
                  <Input
                    id="quick-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={quickEntry.amount}
                    onChange={(e) =>
                      setQuickEntry((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quick-type">Type</Label>
                  <Select
                    value={quickEntry.type}
                    onValueChange={(value) => {
                      const nextType = value as ManualRow["type"]
                      const newCategories = getCategoriesForType(nextType)
                      setQuickEntry((prev) => ({
                        ...prev,
                        type: nextType,
                        // Reset category if it doesn't exist in new type's categories
                        category: newCategories.includes(prev.category) ? prev.category : ""
                      }))
                    }}
                  >
                    <SelectTrigger id="quick-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-category">Category</Label>
                  <Select
                    value={quickEntry.category}
                    onValueChange={(value) =>
                      setQuickEntry((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger id="quick-category">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {getCategoriesForType(quickEntry.type).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-date">Date</Label>
                  <Input
                    id="quick-date"
                    type="date"
                    value={quickEntry.date}
                    onChange={(e) =>
                      setQuickEntry((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleQuickSubmit}
                disabled={isSubmitting || !quickEntry.description || !quickEntry.amount}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Entry Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Entry</CardTitle>
              <CardDescription>
                Add multiple transactions at once. {validRowCount} valid{" "}
                {validRowCount === 1 ? "entry" : "entries"} ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Desktop Header */}
              <div className="hidden grid-cols-12 gap-2 text-xs font-medium text-muted-foreground lg:grid">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Description</div>
                <div>Type</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* Entry Rows */}
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <EntryRow
                    key={row.id}
                    row={row}
                    index={index}
                    onChange={handleRowChange}
                    onRemove={handleRemoveRow}
                    canRemove={rows.length > 1}
                    getCategoriesForType={getCategoriesForType}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleAddRow}>
                  <Plus className="mr-2 size-4" />
                  Add Row
                </Button>
                <Button
                  onClick={handleSubmitRows}
                  disabled={isSubmitting || validRowCount === 0}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 size-4" />
                  )}
                  Submit {validRowCount} {validRowCount === 1 ? "Entry" : "Entries"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Paste Tab */}
        <TabsContent value="paste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Paste</CardTitle>
              <CardDescription>
                Paste data from a spreadsheet (CSV or tab-delimited)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-paste">Paste your data</Label>
                <Textarea
                  id="bulk-paste"
                  rows={8}
                  placeholder="2025-01-15, Coffee Shop, Food & Dining, 4.50, expense&#10;2025-01-14, Grocery Store, Food & Dining, 82.30, expense"
                  value={bulkPaste}
                  onChange={(e) => setBulkPaste(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Format: date, description, category, amount, type (expense/income/transfer)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {rows.length} row{rows.length !== 1 ? "s" : ""} in batch queue
                </p>
                <Button variant="outline" onClick={handleBulkParse}>
                  <ClipboardPaste className="mr-2 size-4" />
                  Parse & Add to Batch
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview of parsed rows */}
          {rows.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Preview</CardTitle>
                <CardDescription>
                  {validRowCount} valid entries ready to submit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {rows.slice(0, 10).map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {row.description || "(no description)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.date} • {row.category || "Uncategorized"}
                        </p>
                      </div>
                      <p className="ml-4 font-mono">
                        {row.type === "income" ? "+" : "-"}${row.amount || "0"}
                      </p>
                    </div>
                  ))}
                  {rows.length > 10 && (
                    <p className="text-center text-xs text-muted-foreground">
                      And {rows.length - 10} more...
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleSubmitRows}
                  disabled={isSubmitting || validRowCount === 0}
                  className="mt-4 w-full"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 size-4" />
                  )}
                  Submit All Entries
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface EntryRowProps {
  row: ManualRow
  index: number
  onChange: (id: string, field: keyof ManualRow, value: string) => void
  onRemove: (id: string) => void
  canRemove: boolean
  getCategoriesForType: (type: "income" | "expense" | "transfer") => string[]
}

function EntryRow({ row, index, onChange, onRemove, canRemove, getCategoriesForType }: EntryRowProps) {
  const categories = getCategoriesForType(row.type)
  
  // Reset category if current selection doesn't exist in new type's categories
  const handleTypeChange = (value: string) => {
    const nextType = value as ManualRow["type"]
    onChange(row.id, "type", nextType)
    const newCategories = getCategoriesForType(nextType)
    if (row.category && !newCategories.includes(row.category)) {
      onChange(row.id, "category", "")
    }
  }
  
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 lg:grid lg:grid-cols-12 lg:gap-2 lg:space-y-0 lg:border-0 lg:bg-transparent lg:p-0">
      {/* Mobile Label */}
      <p className="text-xs font-medium text-muted-foreground lg:hidden">
        Entry {index + 1}
      </p>

      {/* Date */}
      <div className="lg:col-span-2">
        <Label className="lg:sr-only">Date</Label>
        <Input
          type="date"
          value={row.date}
          onChange={(e) => onChange(row.id, "date", e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="lg:col-span-3">
        <Label className="lg:sr-only">Description</Label>
        <Input
          placeholder="Description"
          value={row.description}
          onChange={(e) => onChange(row.id, "description", e.target.value)}
        />
      </div>

      {/* Type - Move before Category so type selection affects category options */}
      <div className="lg:col-span-1">
        <Label className="lg:sr-only">Type</Label>
        <Select
          value={row.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="lg:col-span-2">
        <Label className="lg:sr-only">Category</Label>
        <Select
          value={row.category}
          onValueChange={(value) => onChange(row.id, "category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="lg:col-span-2">
        <Label className="lg:sr-only">Amount</Label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={row.amount}
          onChange={(e) => onChange(row.id, "amount", e.target.value)}
          className="text-right"
        />
      </div>

      {/* Remove Button */}
      <div className="lg:col-span-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(row.id)}
          disabled={!canRemove}
          className="size-10"
          aria-label="Remove row"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
