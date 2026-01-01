import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { Calendar, Moon, Search, Sparkles, Sun, Turtle, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsDialog } from "@/components/settings-dialog"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  monthsLoaded?: number
  onDataCleared?: () => void
  onSearchChange?: (value: string) => void
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Transactions", href: "#transactions" },
  { label: "Budgets", href: "#budgets" },
  { label: "Insights", href: "#insights" },
  { label: "Data", href: "#data" },
  { label: "Customization", href: "#customization" },
  { label: "Settings", href: "#settings" },
]

export function DashboardHeader({ monthsLoaded = 3, onDataCleared, onSearchChange }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("reduced-motion", reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    if (onSearchChange) {
      const id = setTimeout(() => onSearchChange(query), 180)
      return () => clearTimeout(id)
    }
  }, [query, onSearchChange])

  const themeIsDark = useMemo(() => theme === "dark", [theme])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
      <div className="texture-overlay" aria-hidden />
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Halcyon Finance</h1>
              <Badge variant="outline" className="gap-1 bg-secondary/60">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Calm mode
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Modern, tactile finance workspace with guided navigation
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          {monthsLoaded > 0 && (
            <Badge variant="secondary" className="gap-1.5 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5" />
              {monthsLoaded} {monthsLoaded === 1 ? "month" : "months"} loaded
            </Badge>
          )}

          <div className="relative hidden w-64 items-center lg:flex">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Quick search or jump..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-12"
            />
            <span className="absolute right-3 text-[11px] text-muted-foreground">⌘K</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-10 w-10", themeIsDark && "bg-secondary/40")}
            onClick={() => setTheme(themeIsDark ? "light" : "dark")}
          >
            {themeIsDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant={reducedMotion ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10"
            onClick={() => setReducedMotion((prev) => !prev)}
            title="Toggle reduced motion"
          >
          <Turtle className="h-4 w-4" />
            <span className="sr-only">Toggle reduced motion</span>
          </Button>

          <SettingsDialog onDataCleared={onDataCleared} />
        </div>
      </div>
    </header>
  )
}
