import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Transaction } from "@/types/transaction"
import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Wallet } from "lucide-react"

interface DashboardStatsProps {
  transactions: Transaction[]
}

export function DashboardStats({ transactions }: DashboardStatsProps) {
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netCashFlow = totalIncome - totalExpenses
  const avgTransaction =
    transactions.length > 0 ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length : 0

  const currentBalance = totalIncome - totalExpenses

  const stats = [
    {
      title: "Total Income",
      value: totalIncome,
      icon: ArrowUpRight,
      trend: "+12.5%",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Expenses",
      value: totalExpenses,
      icon: ArrowDownRight,
      trend: "-8.3%",
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
    {
      title: "Net Cash Flow",
      value: netCashFlow,
      icon: TrendingUp,
      trend: netCashFlow >= 0 ? "Positive" : "Negative",
      color: netCashFlow >= 0 ? "text-emerald-500" : "text-rose-500",
      bgColor: netCashFlow >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
    {
      title: "Avg. Transaction",
      value: avgTransaction,
      icon: DollarSign,
      trend: `${transactions.length} total`,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Current Balance",
      value: currentBalance,
      icon: Wallet,
      trend: "Available funds",
      color: currentBalance >= 0 ? "text-emerald-500" : "text-rose-500",
      bgColor: currentBalance >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Math.abs(stat.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className={`text-xs mt-1 ${stat.color}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
