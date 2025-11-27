import { Router } from "express"
import {
  uploadTransactions,
  listTransactions,
  getMonthlySummaryData,
  getCategorySummaryData,
} from "../controllers/transactionController.js"
import multer from "multer"

const router = Router()

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" })

// POST /api/transactions/upload - Upload CSV file
router.post("/upload", upload.single("file"), uploadTransactions)

// GET /api/transactions - List transactions with optional filters
router.get("/", listTransactions)

// GET /api/transactions/summary/monthly - Get monthly summary
router.get("/summary/monthly", getMonthlySummaryData)

// GET /api/transactions/summary/categories - Get category summary
router.get("/summary/categories", getCategorySummaryData)

export default router
