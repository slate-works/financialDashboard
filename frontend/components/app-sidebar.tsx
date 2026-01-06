"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  PenLine,
  CreditCard,
  Upload,
  BarChart3,
  Settings,
  Wallet,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeSwitch } from "@/components/theme-switch"
import { useState, useEffect } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Manual Entry", href: "/entry", icon: PenLine },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Insights", href: "/insights", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <>
      {/* Mobile header bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background lg:hidden">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <span className="font-semibold text-foreground">Finance</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu drawer */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-sidebar transition-transform duration-200 ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
            <Wallet className="size-5" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Finance Dashboard</span>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <ThemeSwitch variant="full" className="w-full" />
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary/10 text-sidebar-primary">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Finance</h1>
            <p className="text-xs text-sidebar-foreground/60">Personal Dashboard</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <ThemeSwitch variant="full" className="w-full" />
        </div>
      </aside>
    </>
  )
}
