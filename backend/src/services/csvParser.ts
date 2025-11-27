import { parse } from "csv-parse/sync"
import fs from "fs"

export interface ParsedTransaction {
  date: Date
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  account: string
  note?: string | null
}

/**
 * Parse date from MM/DD/YYYY format to Date object
 */
function parsePeriodToDate(period: string): Date {
  const [month, day, year] = period.split("/").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Remove emoji, icons, and non-ASCII characters from category text
 */
function cleanCategory(raw: string | null | undefined): string {
  if (!raw) return "Uncategorized"
  // Remove non-ASCII and weird icon characters
  const noIcons = raw.replace(/[^\x20-\x7E]/g, "")
  // Remove any characters that are NOT letters, numbers, space, slash, ampersand
  const cleaned = noIcons.replace(/[^a-zA-Z0-9/& ]+/g, "").trim()
  return cleaned || "Uncategorized"
}

/**
 * Build description from Note column, fallback to category
 */
function buildDescription(note: any, category: string): string {
  const n = typeof note === "string" ? note.trim() : ""
  if (n.length > 0) return n
  if (category.length > 0) return category
  return "Unknown"
}

/**
 * Parse type and amount from Income/Expense flag and USD column
 */
function parseTypeAndAmount(flag: any, usd: any): { type: "income" | "expense"; amount: number } {
  const rawFlag = String(flag || "").toLowerCase()
  const numeric = typeof usd === "number" ? usd : parseFloat(String(usd))
  
  if (Number.isNaN(numeric)) {
    return { type: "expense", amount: 0 }
  }

  if (rawFlag.includes("exp")) {
    return { type: "expense", amount: -Math.abs(numeric) }
  }
  if (rawFlag.includes("inc")) {
    return { type: "income", amount: Math.abs(numeric) }
  }

  // default to expense if unknown
  return { type: "expense", amount: -Math.abs(numeric) }
}

/**
 * Map CSV row to transaction object
 */
export function mapCsvRowToTransaction(row: any): ParsedTransaction {
  const date = parsePeriodToDate(String(row.Period))
  const account = row.Accounts ? String(row.Accounts).trim() : "Unknown"
  const category = cleanCategory(row.Category as string | undefined)
  const { type, amount } = parseTypeAndAmount(row["Income/Expense"], row.USD)
  const description = buildDescription(row.Note, category)

  return {
    date,
    account,
    category,
    description,
    amount,
    type,
    note: null,
  }
}

/**
 * Parse CSV file from Money Manager export and convert to transaction objects
 * 
 * Expected CSV format:
 * Period, Accounts, Category, Subcategory, Note, USD, Income/Expense, Description, Amount, Currency, Accounts.1
 */
export async function parseCSVFile(filePath: string): Promise<ParsedTransaction[]> {
  // Read file with latin1 encoding to handle non-UTF8 characters
  const fileContent = fs.readFileSync(filePath, "latin1")
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  const transactions: ParsedTransaction[] = []

  for (const record of records) {
    // Skip if missing essential data
    if (!record.Period || !record.USD) {
      continue
    }

    try {
      const transaction = mapCsvRowToTransaction(record)
      
      console.log('Parsed transaction:', {
        date: transaction.date.toISOString(),
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount,
        type: transaction.type,
        account: transaction.account
      })
      
      // Skip transactions with zero amount
      if (transaction.amount === 0) {
        continue
      }
      
      transactions.push(transaction)
    } catch (error) {
      console.error("Error parsing CSV row:", error, record)
      // Continue processing other rows
    }
  }

  // Clean up uploaded file
  fs.unlinkSync(filePath)

  return transactions
}
