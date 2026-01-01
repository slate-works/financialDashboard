"use client"

import { CreditCard, Calendar, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Track and manage your recurring expenses"
      />

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <CreditCard className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Subscriptions Yet</h3>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Subscription tracking is not yet connected to your data. You can track recurring
            expenses by categorizing your transactions or adding them manually.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/transactions">View Transactions</Link>
            </Button>
            <Button asChild>
              <Link href="/entry">Add Entry</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-5" />
              Track Recurring Expenses
            </CardTitle>
            <CardDescription>
              Use consistent category names in your transactions to track recurring expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When you import or add transactions, use categories like "Subscriptions",
              "Streaming", or "Memberships" to easily filter and track recurring costs
              in the Transactions and Insights pages.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-5" />
              Feature Coming Soon
            </CardTitle>
            <CardDescription>
              Automatic subscription detection and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In a future update, this page will automatically detect recurring
              transactions and help you manage subscriptions, track billing dates,
              and identify unused services.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
