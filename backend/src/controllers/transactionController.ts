import type { Request, Response } from "express"
import { parseCSVFile } from "../services/csvParser.js"
import type { TransactionFilters } from "../services/transactionService.js"
import {
  createManyTransactions,
  getTransactions,
  getMonthlySummary,
  getCategorySummary,
  deleteAllTransactions as deleteAllTransactionsService,
} from "../services/transactionService.js"

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
