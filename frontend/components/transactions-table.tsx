"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Transaction } from "@/types/transaction"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found. Upload a CSV file to get started.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {transaction.category}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
