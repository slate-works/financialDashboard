import { Router } from "express"
import type { Request, Response } from "express"
import {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionStatus,
} from "../services/subscriptionService.js"

const router = Router()

/**
 * GET /api/subscriptions
 * List all subscriptions
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const subscriptions = await getSubscriptions()
    res.json({ success: true, subscriptions })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    res.status(500).json({ error: "Failed to fetch subscriptions" })
  }
})

/**
 * GET /api/subscriptions/:id
 * Get a single subscription
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid subscription ID" })
      return
    }

    const subscription = await getSubscriptionById(id)
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found" })
      return
    }

    res.json({ success: true, subscription })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    res.status(500).json({ error: "Failed to fetch subscription" })
  }
})

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, amount, category, interval, startDate, isActive } = req.body

    if (!name || amount === undefined || !category || !interval) {
      res.status(400).json({ error: "Missing required fields: name, amount, category, interval" })
      return
    }

    const subscription = await createSubscription({
      name,
      amount: parseFloat(amount),
      category,
      interval,
      startDate: startDate || new Date().toISOString(),
      isActive: isActive ?? true,
    })

    res.status(201).json({ success: true, subscription })
  } catch (error) {
    console.error("Error creating subscription:", error)
    res.status(500).json({ error: "Failed to create subscription" })
  }
})

/**
 * PATCH /api/subscriptions/:id
 * Update a subscription (partial update)
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid subscription ID" })
      return
    }

    const { name, amount, category, interval, startDate, isActive } = req.body

    const subscription = await updateSubscription(id, {
      ...(name !== undefined && { name }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(category !== undefined && { category }),
      ...(interval !== undefined && { interval }),
      ...(startDate !== undefined && { startDate }),
      ...(isActive !== undefined && { isActive }),
    })

    res.json({ success: true, subscription })
  } catch (error) {
    console.error("Error updating subscription:", error)
    res.status(500).json({ error: "Failed to update subscription" })
  }
})

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid subscription ID" })
      return
    }

    await deleteSubscription(id)
    res.json({ success: true, message: "Subscription deleted" })
  } catch (error) {
    console.error("Error deleting subscription:", error)
    res.status(500).json({ error: "Failed to delete subscription" })
  }
})

export default router
