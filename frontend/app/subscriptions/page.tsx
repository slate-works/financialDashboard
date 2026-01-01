"use client"

import { useState } from "react"
import { CreditCard, Calendar, AlertCircle, Plus, Trash2, Repeat } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { useData } from "@/lib/data-context"
import { formatCurrency, fixTextEncoding } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

const SUBSCRIPTION_CATEGORIES = [
  "Subscriptions",
  "Entertainment",
  "Bills",
  "Software",
  "Music",
  "Streaming",
  "Gaming",
  "Cloud Storage",
  "Fitness",
  "News & Media",
  "Other",
]

export default function SubscriptionsPage() {
  const { subscriptions, deleteSubscription, updateSubscription, addSubscription, transactions } = useData()
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [newSubscription, setNewSubscription] = useState({
    name: "",
    amount: "",
    category: "Subscriptions",
    interval: "monthly",
    startDate: format(new Date(), "yyyy-MM-dd"),
  })
  
  // Get categories from existing transactions for the dropdown
  const allCategories = Array.from(new Set([
    ...SUBSCRIPTION_CATEGORIES,
    ...transactions.map(t => t.category).filter(Boolean)
  ])).sort()
  
  const handleCreateSubscription = async () => {
    if (!newSubscription.name || !newSubscription.amount) return
    
    setIsSubmitting(true)
    try {
      const success = await addSubscription({
        name: newSubscription.name,
        amount: parseFloat(newSubscription.amount),
        category: newSubscription.category,
        interval: newSubscription.interval,
        startDate: newSubscription.startDate,
        isActive: true,
      })
      
      if (success) {
        setDialogOpen(false)
        setNewSubscription({
          name: "",
          amount: "",
          category: "Subscriptions",
          interval: "monthly",
          startDate: format(new Date(), "yyyy-MM-dd"),
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalMonthly = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      // Simple normalization: if yearly, divide by 12. If weekly, multiply by 4.
      if (s.interval === 'yearly') return sum + s.amount / 12
      if (s.interval === 'weekly') return sum + s.amount * 4
      return sum + s.amount
    }, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Track and manage your recurring expenses"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
              <DialogDescription>
                Track a new recurring expense
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name">Name</Label>
                <Input
                  id="sub-name"
                  placeholder="e.g., Netflix, Spotify"
                  value={newSubscription.name}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sub-amount">Amount</Label>
                  <Input
                    id="sub-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newSubscription.amount}
                    onChange={(e) => setNewSubscription(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sub-interval">Billing Interval</Label>
                  <Select
                    value={newSubscription.interval}
                    onValueChange={(value) => setNewSubscription(prev => ({ ...prev, interval: value }))}
                  >
                    <SelectTrigger id="sub-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sub-category">Category</Label>
                  <Select
                    value={newSubscription.category}
                    onValueChange={(value) => setNewSubscription(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="sub-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sub-date">Start Date</Label>
                  <Input
                    id="sub-date"
                    type="date"
                    value={newSubscription.startDate}
                    onChange={(e) => setNewSubscription(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubscription}
                disabled={isSubmitting || !newSubscription.name || !newSubscription.amount}
              >
                {isSubmitting ? "Adding..." : "Add Subscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated recurring expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.filter(s => s.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              Services you are tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {subscriptions.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Repeat className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No Subscriptions Yet</h3>
            <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
              Track your recurring expenses like Netflix, Spotify, or gym memberships.
              Add a subscription manually or go to transactions and click the menu on any
              transaction to track it as a subscription.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/transactions">View Transactions</Link>
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Subscription List */
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className={!sub.isActive ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">
                      {fixTextEncoding(sub.name)}
                    </CardTitle>
                    <CardDescription className="text-xs capitalize">
                      {sub.interval} • {fixTextEncoding(sub.category)}
                    </CardDescription>
                  </div>
                  <div className="font-bold text-destructive">
                    -{formatCurrency(sub.amount)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between pt-4">
                    <Badge variant={sub.isActive ? "default" : "secondary"}>
                      {sub.isActive ? "Active" : "Paused"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSubscription(sub.id, !sub.isActive)}
                      >
                        {sub.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => deleteSubscription(sub.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
