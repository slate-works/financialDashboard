import { Router } from "express"
import {
  uploadTransactions,
  listTransactions,
  getMonthlySummaryData,
  getCategorySummaryData,
  createTransaction,
  createManualTransactions,
  getOverviewData,
  deleteAllTransactions,
} from "../controllers/transactionController.js"
import multer from "multer"

const router = Router()

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" })

// POST /api/transactions/upload - Upload CSV file
router.post("/upload", upload.single("file"), uploadTransactions)
// POST /api/transactions - Single create
router.post("/", createTransaction)
// POST /api/transactions/manual - Batch create
router.post("/manual", createManualTransactions)

// GET /api/transactions - List transactions with optional filters
router.get("/", listTransactions)

// DELETE /api/transactions - Delete all transactions
router.delete("/", deleteAllTransactions)

// GET /api/transactions/summary/monthly - Get monthly summary
router.get("/summary/monthly", getMonthlySummaryData)

// GET /api/transactions/summary/categories - Get category summary
router.get("/summary/categories", getCategorySummaryData)
// GET /api/transactions/summary/overview - KPIs
router.get("/summary/overview", getOverviewData)

export default router
