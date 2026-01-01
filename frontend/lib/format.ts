/**
 * Formatting utilities for the finance dashboard
 */

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(value: number): string {
  return `$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format a number as currency with sign
 */
export function formatCurrencyWithSign(value: number): string {
  const prefix = value >= 0 ? "+" : "-"
  return `${prefix}${formatCurrency(value)}`
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a date for display
 */
export function formatDate(
  date: string | Date,
  format: "short" | "medium" | "long" = "medium"
): string {
  const d = typeof date === "string" ? new Date(date) : date
  
  switch (format) {
    case "short":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    case "long":
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    case "medium":
    default:
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
  }
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`
  
  return formatDate(d, "short")
}

/**
 * Get the current month/year string
 */
export function getCurrentMonthYear(): string {
  const now = new Date()
  return now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

/**
 * Get month abbreviation with year (e.g., "Jan '25")
 */
export function getMonthAbbr(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  })
}
