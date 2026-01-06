import type { Request, Response } from "express"
import { z } from "zod"
import { parseCSVFile } from "../services/csvParser.js"
import type { TransactionFilters } from "../services/transactionService.js"
import {
  createManyTransactions,
  createTransactionRecord,
  getTransactions,
  getMonthlySummary,
  getCategorySummary,
  getOverviewSummary,
  deleteAllTransactions as deleteAllTransactionsService,
  deduplicateTransactions as deduplicateTransactionsService,
} from "../services/transactionService.js"
import { computeFinancialAnalytics } from "../services/financialAnalytics.js"

const transactionPayloadSchema = z.object({
  date: z.union([z.string(), z.date()]).optional(),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  amount: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "number" ? value : Number.parseFloat(value)))
    .refine((value) => Number.isFinite(value), { message: "Amount must be a valid number" }),
  type: z.enum(["income", "expense", "transfer"]).default("expense"),
  account: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

const manualTransactionsSchema = z.array(transactionPayloadSchema)

/**
 * POST /api/transactions/upload
 * Upload and parse CSV file
 */
export async function uploadTransactions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" })
      return
    }

    const transactions = await parseCSVFile(req.file.path)
    
    console.log(`Parsed ${transactions.length} transactions from CSV`)
    console.log('First transaction sample:', transactions[0])
    
    const created = await createManyTransactions(transactions)

    res.json({
      success: true,
      count: created.length,
      transactions: created,
    })
  } catch (error) {
    console.error("Error uploading transactions:", error)
    res.status(500).json({ error: "Failed to upload transactions" })
  }
}

/**
 * POST /api/transactions
 * Create a single transaction (manual entry)
 */
export async function createTransaction(req: Request, res: Response): Promise<void> {
  try {
    const parsed = transactionPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid transaction payload", details: parsed.error.flatten() })
      return
    }

    const payload = parsed.data
    const created = await createTransactionRecord({
      date: payload.date ? new Date(payload.date) : new Date(),
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      type: payload.type,
      account: payload.account ?? null,
      note: payload.note ?? null,
      isAnomaly: false,
      anomalyScore: null,
      anomalyReason: null,
      recurringPatternId: null,
    })

    res.status(201).json({ success: true, transaction: created })
  } catch (error) {
    console.error("Error creating transaction:", error)
    res.status(500).json({ error: "Failed to create transaction" })
  }
}

/**
 * POST /api/transactions/manual
 * Create multiple transactions from batch/manual entry
 */
export async function createManualTransactions(req: Request, res: Response): Promise<void> {
  try {
    const payload = Array.isArray(req.body) ? req.body : (req.body?.transactions ?? [])
    const parsed = manualTransactionsSchema.safeParse(payload)

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid manual transactions", details: parsed.error.flatten() })
      return
    }

    const normalized = parsed.data.map((item) => ({
      date: item.date ? new Date(item.date) : new Date(),
      description: item.description,
      category: item.category,
      amount: item.amount,
      type: item.type,
      account: item.account ?? null,
      note: item.note ?? null,
    }))

    const created = await createManyTransactions(normalized)

    res.status(201).json({
      success: true,
      count: created.length,
      transactions: created,
    })
  } catch (error) {
    console.error("Error creating manual transactions:", error)
    res.status(500).json({ error: "Failed to create manual transactions" })
  }
}

/**
 * GET /api/transactions
 * List transactions with optional filters
 */
export async function listTransactions(req: Request, res: Response): Promise<void> {
  try {
    const filters: TransactionFilters = {}
    
    if (req.query.categories) {
      filters.categories = (req.query.categories as string).split(",")
    }
    if (req.query.dateFrom) {
      filters.dateFrom = req.query.dateFrom as string
    }
    if (req.query.dateTo) {
      filters.dateTo = req.query.dateTo as string
    }
    if (req.query.searchText) {
      filters.searchText = req.query.searchText as string
    }
    if (req.query.type) {
      filters.type = req.query.type as "income" | "expense" | "transfer"
    }

    const transactions = await getTransactions(filters)

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    res.status(500).json({ error: "Failed to fetch transactions" })
  }
}

/**
 * GET /api/transactions/summary/monthly
 * Get monthly summary
 */
export async function getMonthlySummaryData(req: Request, res: Response): Promise<void> {
  try {
    const summary = await getMonthlySummary()

    res.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error("Error fetching monthly summary:", error)
    res.status(500).json({ error: "Failed to fetch monthly summary" })
  }
}

/**
 * GET /api/transactions/summary/categories
 * Get category summary
 */
export async function getCategorySummaryData(req: Request, res: Response): Promise<void> {
  try {
    const summary = await getCategorySummary()

    res.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error("Error fetching category summary:", error)
    res.status(500).json({ error: "Failed to fetch category summary" })
  }
}

/**
 * GET /api/transactions/summary/overview
 * High-level KPIs for dashboard
 */
export async function getOverviewData(req: Request, res: Response): Promise<void> {
  try {
    const overview = await getOverviewSummary()

    res.json({
      success: true,
      overview,
    })
  } catch (error) {
    console.error("Error fetching overview summary:", error)
    res.status(500).json({ error: "Failed to fetch overview summary" })
  }
}

/**
 * DELETE /api/transactions
 * Delete all transactions
 */
export async function deleteAllTransactions(req: Request, res: Response): Promise<void> {
  try {
    const count = await deleteAllTransactionsService()

    res.json({
      success: true,
      message: `Deleted ${count} transactions`,
      count,
    })
  } catch (error) {
    console.error("Error deleting transactions:", error)
    res.status(500).json({ error: "Failed to delete transactions" })
  }
}

/**
 * POST /api/transactions/deduplicate
 * Remove duplicate transactions and fix encoding issues
 */
export async function deduplicateTransactions(req: Request, res: Response): Promise<void> {
  try {
    const result = await deduplicateTransactionsService()

    res.json({
      success: true,
      message: `Removed ${result.deleted} duplicates and fixed ${result.fixed} encoding issues`,
      ...result,
    })
  } catch (error) {
    console.error("Error deduplicating transactions:", error)
    res.status(500).json({ error: "Failed to deduplicate transactions" })
  }
}

/**
 * GET /api/transactions/analytics
 * Full financial analytics with confidence scoring and interpretable metrics
 */
export async function getFinancialAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 6
    const analytics = await computeFinancialAnalytics({ monthsToAnalyze: months })

    res.json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error("Error computing financial analytics:", error)
    res.status(500).json({ error: "Failed to compute financial analytics" })
  }
}
