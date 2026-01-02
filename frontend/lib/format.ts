/**
 * Formatting utilities for the finance dashboard
 */

/**
 * Fix common text encoding issues (corrupted apostrophes, quotes, etc.)
 */
export function fixTextEncoding(text: string): string {
  if (!text) return ""
  
  return text
    // Fix UTF-8 interpreted as Windows-1252 encoding issues
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€"/g, "-")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å"/g, '"')
    .replace(/Ã¢â‚¬/g, '"')
    // Fix curly quotes/apostrophes to straight ones
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    // Fix double vertical line and other misencoded apostrophes
    .replace(/[\u2016]/g, "'")        // Double vertical line to apostrophe
    .replace(/[\u2015]/g, "-")        // Horizontal bar to hyphen
    .replace(/[\uFFFD]/g, "'")        // Replacement character to apostrophe
    // Fix Windows-1252 specific characters
    .replace(/\u0092/g, "'")          // Windows-1252 right single quote
    .replace(/\u0091/g, "'")          // Windows-1252 left single quote
    .replace(/\u0093/g, '"')          // Windows-1252 left double quote
    .replace(/\u0094/g, '"')          // Windows-1252 right double quote
    .replace(/\u0096/g, "-")          // Windows-1252 en dash
    .replace(/\u0097/g, "-")          // Windows-1252 em dash
    // Additional patterns for corrupted apostrophes
    .replace(/['`´ʼʻˈˊ‖]/g, "'")      // Various quote-like characters
    .replace(/[""„‟]/g, '"')          // Various double quote characters
}

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
