"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Transaction } from "@/types/transaction"
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, CreditCard } from "lucide-react"
import { fixTextEncoding } from "@/lib/format"
import { useData } from "@/lib/data-context"

interface TransactionsTableProps {
  transactions: Transaction[]
}

const INITIAL_DISPLAY_COUNT = 10

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)
  const { addSubscription } = useData()
  
  const displayedTransactions = transactions.slice(0, displayCount)
  const hasMore = transactions.length > displayCount
  
  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + 10, transactions.length))
  }

  const handleSetSubscription = async (transaction: Transaction) => {
    await addSubscription({
      name: transaction.description,
      amount: Math.abs(transaction.amount),
      category: transaction.category,
      interval: "monthly",
      startDate: transaction.date,
      isActive: true,
    })
  }
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Showing {displayedTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transactions found. Upload a CSV file to get started.
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{fixTextEncoding(transaction.description)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {fixTextEncoding(transaction.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {transaction.type === "income" ? (
                          <>
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-500 text-sm font-medium">Income</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-4 h-4 text-rose-500" />
                            <span className="text-rose-500 text-sm font-medium">Expense</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold font-mono">
                      <span className={transaction.type === "income" ? "text-emerald-500" : "text-rose-500"}>
                        {transaction.type === "income" ? "+" : "-"}$
                        {Math.abs(transaction.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleSetSubscription(transaction)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Track as Subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={handleShowMore}
              variant="outline"
              size="sm"
            >
              Show More ({transactions.length - displayCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
