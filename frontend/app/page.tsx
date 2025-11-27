"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { DashboardCharts } from "@/components/dashboard-charts"
import { TransactionsTable } from "@/components/transactions-table"
import { UploadDialog } from "@/components/upload-dialog"
import { TransactionFilters } from "@/components/transaction-filters"
import type { Transaction } from "@/types/transaction"
import { generateMockTransactions } from "@/lib/mock-data"

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load transactions from backend on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/transactions')
        const data = await response.json()
        
        if (data.success && data.transactions) {
          setTransactions(data.transactions)
          setFilteredTransactions(data.transactions)
        }
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTransactions()
  }, [])

  const monthsLoaded = useMemo(() => {
    const uniqueMonths = new Set(
      transactions.map((t) => {
        const date = new Date(t.date)
        return `${date.getFullYear()}-${date.getMonth()}`
      }),
    )
    return uniqueMonths.size
  }, [transactions])

  const handleFileUpload = async (file: File) => {
    try {
      // Upload file to backend API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:3001/api/transactions/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      if (data.success) {
        // Reload transactions after successful upload
        loadTransactions()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file. Please try again.')
    }
  }

  const loadTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transactions')
      const data = await response.json()
      
      if (data.success && data.transactions) {
        setTransactions(data.transactions)
        setFilteredTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const handleDataCleared = () => {
    setTransactions([])
    setFilteredTransactions([])
  }

  const handleFilterChange = (filters: {
    categories: string[]
    dateRange: { from: Date | undefined; to: Date | undefined }
    searchText: string
    month?: string
  }) => {
    let filtered = [...transactions]

    if (filters.month) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.date)
        const monthStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        return monthStr === filters.month
      })
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      filtered = filtered.filter((t) => filters.categories.includes(t.category))
    }

    // Filter by date range
    if (filters.dateRange.from) {
      filtered = filtered.filter((t) => new Date(t.date) >= filters.dateRange.from!)
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter((t) => new Date(t.date) <= filters.dateRange.to!)
    }

    // Filter by search text
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase()
      filtered = filtered.filter(
        (t) => t.description.toLowerCase().includes(search) || t.category.toLowerCase().includes(search),
      )
    }

    setFilteredTransactions(filtered)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader monthsLoaded={monthsLoaded} onDataCleared={handleDataCleared} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Financial Overview</h2>
            <p className="text-muted-foreground">Monitor your income, expenses, and savings</p>
          </div>
          <UploadDialog onFileUpload={handleFileUpload} />
        </div>

        {/* Dashboard Stats */}
        <DashboardStats transactions={filteredTransactions} />

        {/* Charts Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Spending Analytics</h3>
            <p className="text-sm text-muted-foreground">Visualize your financial patterns</p>
          </div>
          <DashboardCharts transactions={filteredTransactions} />
        </div>

        {/* Transactions Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Transaction History</h3>
            <p className="text-sm text-muted-foreground">Browse and filter your transactions</p>
          </div>
          <TransactionFilters transactions={transactions} onFilterChange={handleFilterChange} />
          <TransactionsTable transactions={filteredTransactions} />
        </div>
      </main>
    </div>
  )
}

function parseCSV(text: string): Transaction[] {
  const lines = text.split("\n").filter((line) => line.trim())
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((v) => v.trim())
    const transaction: any = {}

    headers.forEach((header, i) => {
      transaction[header] = values[i]
    })

    return {
      id: `${Date.now()}-${index}`,
      date: transaction.date || new Date().toISOString().split("T")[0],
      description: transaction.description || transaction.name || "Unknown",
      amount: Number.parseFloat(transaction.amount) || 0,
      category: transaction.category || "Other",
      type: Number.parseFloat(transaction.amount) >= 0 ? "income" : "expense",
    }
  })
}
