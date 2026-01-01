"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Transaction } from "@/types/transaction"
import { getApiUrl } from "@/lib/config"
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

type ImportMeta = {
  lastFile?: string
  lastCount?: number
  lastImportedAt?: string
}

interface DataContextType {
  transactions: Transaction[]
  overview: OverviewSummary | null
  importMeta: ImportMeta
  isLoading: boolean
  loadTransactions: () => Promise<void>
  loadOverview: () => Promise<void>
  handleFileUpload: (file: File) => Promise<void>
  handleDataCleared: () => void
  submitManualEntries: (entries: ManualEntry[]) => Promise<boolean>
}

type ManualEntry = {
  date: string
  description: string
  category: string
  amount: number
  type: "income" | "expense" | "transfer"
  account?: string | null
  note?: string | null
}

const DataContext = createContext<DataContextType | null>(null)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [overview, setOverview] = useState<OverviewSummary | null>(null)
  const [importMeta, setImportMeta] = useState<ImportMeta>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions`)
      const data = await response.json()

      if (data.success && data.transactions) {
        setTransactions(data.transactions)
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      setTransactions([])
      toast({
        title: "Could not load data",
        description: "Unable to connect to the database. Please check your backend connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadOverview = useCallback(async () => {
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
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
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
  }, [loadTransactions, loadOverview, toast])

  const handleDataCleared = useCallback(() => {
    setTransactions([])
    setOverview(null)
    setImportMeta({})
  }, [])

  const submitManualEntries = useCallback(async (entries: ManualEntry[]): Promise<boolean> => {
    if (entries.length === 0) {
      toast({
        title: "Nothing to add",
        description: "Enter at least one row before submitting.",
      })
      return false
    }

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      })

      if (!response.ok) {
        throw new Error("Manual entry failed")
      }

      const data = await response.json()
      toast({
        title: "Entries saved",
        description: `${data.count ?? entries.length} transactions added successfully`,
      })
      await loadTransactions()
      await loadOverview()
      return true
    } catch (error) {
      console.error("Error saving manual entries:", error)
      toast({
        title: "Could not save entries",
        description: "Please check your values and try again.",
        variant: "destructive",
      })
      return false
    }
  }, [loadTransactions, loadOverview, toast])

  useEffect(() => {
    loadTransactions()
    loadOverview()
  }, [loadTransactions, loadOverview])

  return (
    <DataContext.Provider
      value={{
        transactions,
        overview,
        importMeta,
        isLoading,
        loadTransactions,
        loadOverview,
        handleFileUpload,
        handleDataCleared,
        submitManualEntries,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
