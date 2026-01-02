import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Transaction } from "@/types/transaction"
import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, HeartPulse, ShieldCheck, TrendingUp } from "lucide-react"

type Overview = {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  budgetAdherence: number
  runwayMonths: number | null
  monthsWithData: number
  transactionCount: number
  averageTransaction: number
}

interface DashboardStatsProps {
  transactions: Transaction[]
  overview?: Overview | null
}

const currency = (value: number) =>
  `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function DashboardStats({ transactions, overview }: DashboardStatsProps) {
  const fallbackIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const fallbackExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const fallbackNet = fallbackIncome - fallbackExpenses
  const fallbackAvg =
    transactions.length > 0 ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length : 0

  const stats = [
    {
      title: "Net Cash Flow",
      value: overview?.netCashFlow ?? fallbackNet,
      icon: TrendingUp,
      hint: overview?.monthsWithData ? `${overview.monthsWithData} months of data` : "Live across all data",
      tone: (overview?.netCashFlow ?? fallbackNet) >= 0 ? "text-emerald-500" : "text-rose-500",
      bg: (overview?.netCashFlow ?? fallbackNet) >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
      formatter: currency,
    },
    {
      title: "Savings Rate",
      value: overview?.savingsRate ?? (fallbackIncome ? (fallbackNet / fallbackIncome) * 100 : 0),
      icon: ShieldCheck,
      hint: "Target 15-30%",
      tone: "text-primary",
      bg: "bg-primary/10",
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      title: "Budget Adherence",
      value: overview?.budgetAdherence ?? 0,
      icon: Activity,
      hint: "vs. 85% spend target",
      tone: "text-emerald-500",
      bg: "bg-emerald-500/10",
      formatter: (val: number) => `${Math.min(120, val).toFixed(0)}%`,
    },
    {
      title: "Avg. Ticket",
      value: overview?.averageTransaction ?? fallbackAvg,
      icon: DollarSign,
      hint: `${overview?.transactionCount ?? transactions.length} transactions`,
      tone: "text-blue-500",
      bg: "bg-blue-500/10",
      formatter: currency,
    },
    {
      title: "Runway",
      value: overview?.runwayMonths ?? null,
      icon: HeartPulse,
      hint: overview?.runwayMonths ? "Based on avg monthly net" : "Positive or stable cash flow",
      tone: "text-amber-500",
      bg: "bg-amber-500/10",
      formatter: (val: number | null) => (val && Number.isFinite(val) ? `${val.toFixed(1)} mo` : "Growing"),
    },
    {
      title: "Income vs Spend",
      value: (overview?.totalIncome ?? fallbackIncome) - (overview?.totalExpenses ?? fallbackExpenses),
      icon: ArrowUpRight,
      hint: `${currency(overview?.totalIncome ?? fallbackIncome)} in / ${currency(overview?.totalExpenses ?? fallbackExpenses)} out`,
      tone: "text-emerald-500",
      bg: "bg-emerald-500/10",
      formatter: currency,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.tone}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold leading-tight">{stat.formatter(stat.value as any)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
