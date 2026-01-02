"use client"

import { type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: LucideIcon
  trend?: "positive" | "negative" | "neutral"
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2",
              trend === "positive" && "bg-success/10",
              trend === "negative" && "bg-destructive/10",
              trend === "neutral" && "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "size-4",
                trend === "positive" && "text-success",
                trend === "negative" && "text-destructive",
                trend === "neutral" && "text-primary"
              )}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold",
            trend === "positive" && "text-success",
            trend === "negative" && "text-destructive"
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
