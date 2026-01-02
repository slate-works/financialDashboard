import { prisma } from "../db/index.js"
import type { Subscription } from "@prisma/client"

export interface CreateSubscriptionInput {
  name: string
  amount: number
  category: string
  interval: string
  startDate: string | Date
  isActive?: boolean
}

/**
 * Get all subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Get a single subscription by ID
 */
export async function getSubscriptionById(id: number): Promise<Subscription | null> {
  return prisma.subscription.findUnique({
    where: { id },
  })
}

/**
 * Create a new subscription
 */
export async function createSubscription(data: CreateSubscriptionInput): Promise<Subscription> {
  return prisma.subscription.create({
    data: {
      name: data.name,
      amount: Math.abs(data.amount),
      category: data.category,
      interval: data.interval,
      startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
      isActive: data.isActive ?? true,
    },
  })
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  id: number,
  data: Partial<CreateSubscriptionInput>
): Promise<Subscription> {
  return prisma.subscription.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.amount !== undefined && { amount: Math.abs(data.amount) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.interval !== undefined && { interval: data.interval }),
      ...(data.startDate !== undefined && {
        startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate),
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: number): Promise<void> {
  await prisma.subscription.delete({
    where: { id },
  })
}

/**
 * Toggle subscription active status
 */
export async function toggleSubscriptionStatus(id: number, isActive: boolean): Promise<Subscription> {
  return prisma.subscription.update({
    where: { id },
    data: { isActive },
  })
}
