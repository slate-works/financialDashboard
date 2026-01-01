"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Transaction } from "@/types/transaction"

export type Subscription = {
  id: number
  name: string
  amount: number
  category: string
  interval: string
  startDate: string
  isActive: boolean
}

import type { FinancialAnalytics } from "@/types/analytics"

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
  analytics: FinancialAnalytics | null
  importMeta: ImportMeta
  isLoading: boolean
  loadTransactions: () => Promise<void>
  loadOverview: () => Promise<void>
  loadAnalytics: (months?: number) => Promise<void>
  handleFileUpload: (file: File) => Promise<void>
  handleDataCleared: () => void
  submitManualEntries: (entries: ManualEntry[]) => Promise<boolean>
  subscriptions: Subscription[]
  addSubscription: (data: Omit<Subscription, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  deleteSubscription: (id: number) => Promise<boolean>
  updateSubscription: (id: number, isActive: boolean) => Promise<boolean>
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [overview, setOverview] = useState<OverviewSummary | null>(null)
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null)
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

  const loadAnalytics = useCallback(async (months: number = 6) => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions/analytics?months=${months}`)
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
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
        await loadAnalytics()
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: "Please try again with a valid CSV file.",
        variant: "destructive",
      })
    }
  }, [loadTransactions, loadOverview, loadAnalytics, toast])

  const handleDataCleared = useCallback(() => {
    setTransactions([])
    setOverview(null)
    setAnalytics(null)
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
      await loadAnalytics()
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
  }, [loadTransactions, loadOverview, loadAnalytics, toast])

  const loadSubscriptions = useCallback(async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/subscriptions`)
      const data = await response.json()
      
      if (data.success && data.subscriptions) {
        setSubscriptions(data.subscriptions)
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error)
    }
  }, [])

  const addSubscription = useCallback(async (data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<boolean> => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error("Failed to add subscription")
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Subscription added",
          description: "Subscription has been successfully tracked."
        })
        await loadSubscriptions()
        return true
      }
      return false
    } catch (error) {
      console.error("Error adding subscription:", error)
      toast({
        title: "Error",
        description: "Failed to add subscription.",
        variant: "destructive"
      })
      return false
    }
  }, [loadSubscriptions, toast])

  const deleteSubscription = useCallback(async (id: number): Promise<boolean> => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/subscriptions/${id}`, {
        method: "DELETE"
      })
      
      if (!response.ok) throw new Error("Failed to delete subscription")
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Subscription removed",
          description: "Subscription has been deleted."
        })
        await loadSubscriptions()
        return true
      }
      return false
    } catch (error) {
      console.error("Error deleting subscription:", error)
      toast({
        title: "Error",
        description: "Failed to delete subscription.",
        variant: "destructive"
      })
      return false
    }
  }, [loadSubscriptions, toast])

  const updateSubscription = useCallback(async (id: number, isActive: boolean): Promise<boolean> => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      
      if (!response.ok) throw new Error("Failed to update subscription")
      
      const result = await response.json()
      if (result.success) {
        await loadSubscriptions()
        return true
      }
      return false
    } catch (error) {
      console.error("Error updating subscription:", error)
      return false
    }
  }, [loadSubscriptions])

  useEffect(() => {
    loadTransactions()
    loadOverview()
    loadAnalytics()
    loadSubscriptions()
  }, [loadTransactions, loadOverview, loadAnalytics, loadSubscriptions])

  return (
    <DataContext.Provider
      value={{
        transactions,
        overview,
        analytics,
        importMeta,
        isLoading,
        loadTransactions,
        loadOverview,
        loadAnalytics,
        handleFileUpload,
        handleDataCleared,
        submitManualEntries,
        subscriptions,
        addSubscription,
        deleteSubscription,
        updateSubscription,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
