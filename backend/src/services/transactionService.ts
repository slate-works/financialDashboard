import { prisma } from "../db/index.js"
import type { Prisma, Transaction } from "@prisma/client"

/**
 * Normalize text for comparison - fixes encoding issues and standardizes
 */
function normalizeForComparison(text: string): string {
  if (!text) return ""
  return text
    // Fix all types of apostrophe-like characters
    .replace(/[\u2018\u2019\u2016\uFFFD\u0092\u0091'`´ʼʻˈˊ‖]/g, "'")
    // Fix all types of quote characters
    .replace(/[\u201C\u201D\u0093\u0094""„‟]/g, '"')
    // Fix dashes
    .replace(/[\u2013\u2014\u2015\u0096\u0097]/g, "-")
    // Common encoding corruptions
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .toLowerCase()
    .trim()
}

export interface TransactionFilters {
  categories?: string[]
  dateFrom?: string
  dateTo?: string
  searchText?: string
  type?: "income" | "expense" | "transfer"
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  net: number
}

export interface CategorySummary {
  category: string
  amount: number
  count: number
  type: string
}

export interface OverviewSummary {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  averageTransaction: number
  monthsWithData: number
  transactionCount: number
  budgetAdherence: number
  runwayMonths: number | null
  lastTransactionDate: string | null
  topCategories: Array<{ category: string; amount: number; type: string }>
}

function normalizeTransactionInput(
  input: Omit<Transaction, "id" | "createdAt">,
): Prisma.TransactionCreateInput {
  const date = input.date instanceof Date ? input.date : new Date(input.date)
  const amount = Number.isFinite(input.amount) ? input.amount : 0
  const type = input.type ?? "expense"
  const signedAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount)

  return {
    date: Number.isNaN(date.getTime()) ? new Date() : date,
    description: input.description || "Untitled",
    category: input.category || "Uncategorized",
    amount: signedAmount,
    type,
    account: input.account ?? null,
    note: input.note ?? null,
  }
}

/**
 * Create a single transaction
 */
export async function createTransactionRecord(
  transaction: Omit<Transaction, "id" | "createdAt">,
): Promise<Transaction> {
  const data = normalizeTransactionInput(transaction)
  return prisma.transaction.create({ data })
}

/**
 * Create multiple transactions in the database
 * Checks for duplicates before inserting using normalized comparison
 */
export async function createManyTransactions(
  transactions: Array<{
    date: Date | string
    description: string
    category: string
    amount: number
    type: string
    account?: string | null
    note?: string | null
  }>,
): Promise<Transaction[]> {
  const results: Transaction[] = []

  // Get all existing transactions for duplicate checking
  const existingTransactions = await prisma.transaction.findMany({
    select: { id: true, date: true, description: true, amount: true }
  })

  // Build a set of normalized existing transactions for fast lookup
  const existingSet = new Set(
    existingTransactions.map(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0]
      const normalizedDesc = normalizeForComparison(t.description)
      return `${dateStr}|${normalizedDesc}|${t.amount}`
    })
  )

  // Insert transactions one by one to handle duplicates
  for (const transaction of transactions) {
    const normalized: Omit<Transaction, "id" | "createdAt"> = {
      date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date),
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      type: transaction.type,
      account: transaction.account ?? null,
      note: transaction.note ?? null,
    }

    const data = normalizeTransactionInput(normalized)

    // Create normalized key for duplicate checking
    const dateStr = data.date.toISOString().split('T')[0]
    const normalizedDesc = normalizeForComparison(data.description)
    const key = `${dateStr}|${normalizedDesc}|${data.amount}`

    if (!existingSet.has(key)) {
      const created = await prisma.transaction.create({
        data,
      })
      results.push(created)
      // Add to existing set to prevent duplicates within the same import
      existingSet.add(key)
    } else {
      console.log('Skipping duplicate transaction:', {
        date: data.date,
        description: data.description,
        amount: data.amount,
      })
    }
  }

  return results
}

/**
 * Get transactions with optional filters
 */
export async function getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
  const where: any = {}

  if (filters?.categories && filters.categories.length > 0) {
    where.category = { in: filters.categories }
  }

  if (filters?.type) {
    where.type = filters.type
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {}
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom)
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo)
    }
  }

  if (filters?.searchText) {
    where.OR = [
      { description: { contains: filters.searchText, mode: "insensitive" } },
      { category: { contains: filters.searchText, mode: "insensitive" } },
    ]
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  })

  return transactions
}

/**
 * Get monthly summary of income, expenses, and net cash flow
 */
export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
  })

  const monthlyMap = new Map<string, MonthlySummary>()

  for (const t of transactions) {
    const date = new Date(t.date)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        income: 0,
        expenses: 0,
        net: 0,
      })
    }

    const summary = monthlyMap.get(month)!

    if (t.type === "income") {
      summary.income += Math.abs(t.amount)
    } else if (t.type === "expense") {
      summary.expenses += Math.abs(t.amount)
    }

    summary.net = summary.income - summary.expenses
  }

  return Array.from(monthlyMap.values())
}

/**
 * Get category summary grouped by category
 */
export async function getCategorySummary(): Promise<CategorySummary[]> {
  const transactions = await prisma.transaction.findMany()

  const categoryMap = new Map<string, CategorySummary>()

  for (const t of transactions) {
    const key = `${t.category}-${t.type}`

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        category: t.category,
        amount: 0,
        count: 0,
        type: t.type,
      })
    }

    const summary = categoryMap.get(key)!
    summary.amount += Math.abs(t.amount)
    summary.count += 1
  }

  return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount)
}

/**
 * Delete all transactions from the database
 */
export async function deleteAllTransactions(): Promise<number> {
  const result = await prisma.transaction.deleteMany()
  return result.count
}

/**
 * Clean text by fixing encoding issues (for database cleanup)
 */
function cleanTextForStorage(text: string): string {
  if (!text) return ""
  return text
    // Fix all types of apostrophe-like characters to straight apostrophe
    .replace(/[\u2018\u2019\u2016\uFFFD\u0092\u0091'`´ʼʻˈˊ‖]/g, "'")
    // Fix all types of quote characters
    .replace(/[\u201C\u201D\u0093\u0094""„‟]/g, '"')
    // Fix dashes
    .replace(/[\u2013\u2014\u2015\u0096\u0097]/g, "-")
    // Common encoding corruptions
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, "-")
    .trim()
}

/**
 * Deduplicate transactions in the database
 * Keeps the first occurrence and removes duplicates based on date, normalized description, and amount
 * Also fixes encoding issues in descriptions and categories
 */
export async function deduplicateTransactions(): Promise<{ deleted: number; fixed: number }> {
  const allTransactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'asc' } // Keep oldest entries
  })

  const seen = new Map<string, number>() // key -> id of transaction to keep
  const toDelete: number[] = []
  const toFix: Array<{ id: number; description: string; category: string }> = []

  for (const t of allTransactions) {
    const dateStr = new Date(t.date).toISOString().split('T')[0]
    const normalizedDesc = normalizeForComparison(t.description)
    const key = `${dateStr}|${normalizedDesc}|${t.amount}`

    // Check if description or category needs encoding fix
    const cleanedDesc = cleanTextForStorage(t.description)
    const cleanedCat = cleanTextForStorage(t.category)
    
    if (cleanedDesc !== t.description || cleanedCat !== t.category) {
      toFix.push({ id: t.id, description: cleanedDesc, category: cleanedCat })
    }

    if (seen.has(key)) {
      // This is a duplicate - mark for deletion
      toDelete.push(t.id)
    } else {
      // First occurrence - keep it
      seen.set(key, t.id)
    }
  }

  // First fix encoding issues in transactions we're keeping
  for (const fix of toFix) {
    if (!toDelete.includes(fix.id)) {
      await prisma.transaction.update({
        where: { id: fix.id },
        data: { description: fix.description, category: fix.category }
      })
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    await prisma.transaction.deleteMany({
      where: { id: { in: toDelete } }
    })
  }

  console.log(`Deduplication complete: deleted ${toDelete.length} duplicates, fixed ${toFix.filter(f => !toDelete.includes(f.id)).length} encoding issues`)

  return { 
    deleted: toDelete.length, 
    fixed: toFix.filter(f => !toDelete.includes(f.id)).length 
  }
}

/**
 * Provide an aggregate overview for dashboard KPIs
 */
export async function getOverviewSummary(): Promise<OverviewSummary> {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
  })

  if (transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      savingsRate: 0,
      averageTransaction: 0,
      monthsWithData: 0,
      transactionCount: 0,
      budgetAdherence: 0,
      runwayMonths: null,
      lastTransactionDate: null,
      topCategories: [],
    }
  }

  const monthlyMap = new Map<string, { income: number; expenses: number; net: number }>()
  const categoryMap = new Map<string, { category: string; amount: number; type: string }>()
  let income = 0
  let expenses = 0
  let totalAbsolute = 0

  for (const t of transactions) {
    const date = new Date(t.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { income: 0, expenses: 0, net: 0 })
    }
    const monthBucket = monthlyMap.get(monthKey)!

    const absAmount = Math.abs(t.amount)
    totalAbsolute += absAmount

    if (t.type === "income") {
      income += absAmount
      monthBucket.income += absAmount
    } else if (t.type === "expense") {
      expenses += absAmount
      monthBucket.expenses += absAmount
    }
    monthBucket.net = monthBucket.income - monthBucket.expenses

    const catKey = `${t.category}-${t.type}`
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { category: t.category, amount: 0, type: t.type })
    }
    categoryMap.get(catKey)!.amount += absAmount
  }

  const netCashFlow = income - expenses
  const savingsRate = income === 0 ? 0 : (netCashFlow / income) * 100
  const budgetTarget = income * 0.85 || 1 // assume 85% of income is safe spend
  const budgetAdherence = Math.max(0, Math.min(120, (budgetTarget / Math.max(expenses, 1)) * 100))
  const averageTransaction = totalAbsolute / transactions.length

  const monthlyAverages = Array.from(monthlyMap.values())
  const averageMonthlyNet =
    monthlyAverages.length > 0
      ? monthlyAverages.reduce((sum, item) => sum + item.net, 0) / monthlyAverages.length
      : 0
  const runwayMonths = averageMonthlyNet < 0 ? Math.max(0, netCashFlow / Math.abs(averageMonthlyNet)) : null

  const lastTransactionDate = transactions.at(-1)?.date.toISOString() ?? null

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netCashFlow,
    savingsRate,
    averageTransaction,
    monthsWithData: monthlyMap.size,
    transactionCount: transactions.length,
    budgetAdherence,
    runwayMonths,
    lastTransactionDate,
    topCategories,
  }
}
