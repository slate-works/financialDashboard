/**
 * Finance Dashboard Color Configuration
 * 
 * Design palette: Calm, grounded, insight-first visuals
 * Based on the green/sage theme from the design brief
 */

export const colors = {
  // Base palette from design brief
  cream: {
    light: "93 38% 93%", // #EDF1D6 equivalent in HSL
    dark: "220 15% 12%",
  },
  sage: {
    light: "101 33% 62%", // #9DC08B equivalent
    dark: "101 33% 52%",
  },
  mutedGreen: {
    light: "118 28% 48%", // #609966 equivalent
    dark: "118 28% 58%",
  },
  forest: {
    light: "100 15% 28%", // #40513B equivalent
    dark: "100 15% 75%",
  },
  
  // Semantic colors
  income: {
    light: "142 71% 45%", // emerald-like green
    dark: "142 71% 55%",
  },
  expense: {
    light: "0 84% 60%", // rose-like red
    dark: "0 84% 65%",
  },
  warning: {
    light: "38 92% 50%", // amber
    dark: "38 92% 60%",
  },
} as const

// Category colors for charts - theme aware
export const categoryColors = {
  "Food & Dining": "var(--chart-1)",
  "Transportation": "var(--chart-2)",
  "Shopping": "var(--chart-3)",
  "Entertainment": "var(--chart-4)",
  "Bills": "var(--chart-5)",
  "Healthcare": "var(--chart-6)",
  "Salary": "var(--chart-7)",
  "Freelance": "var(--chart-8)",
  "Uncategorized": "var(--muted-foreground)",
} as const

export type CategoryName = keyof typeof categoryColors
