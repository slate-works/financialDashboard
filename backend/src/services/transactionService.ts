import { prisma } from "../db/index.js"
import type { Transaction } from "@prisma/client"

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

/**
 * Create multiple transactions in the database
 * Checks for duplicates before inserting
 */
export async function createManyTransactions(
  transactions: Array<{
    date: Date
    description: string
    category: string
    amount: number
    type: string
    account?: string | null
    note?: string | null
  }>,
): Promise<Transaction[]> {
  const results: Transaction[] = []

  // Insert transactions one by one to handle duplicates
  for (const transaction of transactions) {
    // Check if transaction already exists (same date, description, amount)
    const existing = await prisma.transaction.findFirst({
      where: {
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
      },
    })

    if (!existing) {
      const created = await prisma.transaction.create({
        data: transaction,
      })
      results.push(created)
    } else {
      console.log('Skipping duplicate transaction:', {
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
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
