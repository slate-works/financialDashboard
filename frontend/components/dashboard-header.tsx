import { Wallet, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DashboardHeaderProps {
  monthsLoaded?: number
}

export function DashboardHeader({ monthsLoaded = 3 }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-balance">Finance Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track and analyze your spending</p>
            </div>
          </div>

          {monthsLoaded > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {monthsLoaded} {monthsLoaded === 1 ? "month" : "months"} loaded
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
