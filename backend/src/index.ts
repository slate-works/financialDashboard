import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import transactionRoutes from "./routes/transactions.js"
import subscriptionRoutes from "./routes/subscriptions.js"
import budgetRoutes from "./routes/budgets.js"
import goalRoutes from "./routes/goals.js"
import debtRoutes from "./routes/debts.js"
import analyticsRoutes from "./routes/analytics.js"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: true, // Allow all origins in production
  credentials: true,
}))
app.use(express.json())

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Mount routes
app.use("/api/transactions", transactionRoutes)
app.use("/api/subscriptions", subscriptionRoutes)
app.use("/api/budgets", budgetRoutes)
app.use("/api/goals", goalRoutes)
app.use("/api/debts", debtRoutes)
app.use("/api/analytics", analyticsRoutes)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`)
})
