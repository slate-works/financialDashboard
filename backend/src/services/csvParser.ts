import { parse } from "csv-parse/sync"
import * as XLSX from "xlsx"
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
  const parts = period.split("/").map(Number)
  const month = parts[0] || 1
  const day = parts[1] || 1
  const year = parts[2] || new Date().getFullYear()
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
 * Clean special characters and fix encoding issues
 */
function cleanText(text: string): string {
  // Replace common encoding issues
  return text
    .replace(/â€™/g, "'")  // Fix apostrophe encoding
    .replace(/â€œ/g, '"')  // Fix opening quote
    .replace(/â€/g, '"')   // Fix closing quote
    .replace(/â€"/g, '-')  // Fix em dash
    .replace(/â€"/g, '-')  // Fix en dash
    .trim()
}

/**
 * Build description from Note or Description columns, fallback to category
 */
function buildDescription(note: any, description: any, category: string): string {
  // Try Note first
  const noteStr = typeof note === "string" ? cleanText(note) : ""
  if (noteStr.length > 0) return noteStr
  
  // Try Description field
  const descStr = typeof description === "string" ? cleanText(description) : ""
  if (descStr.length > 0) return descStr
  
  // Fallback to category
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
  const description = buildDescription(row.Note, row.Description, category)

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
 * Parse CSV or Excel file from Money Manager export
 */
export async function parseCSVFile(filePath: string): Promise<ParsedTransaction[]> {
  let records: any[]

  // Check file extension
  const isExcel = filePath.endsWith('.xlsx') || filePath.endsWith('.xls')

  if (isExcel) {
    // Parse Excel file
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error("No sheets found in Excel file")
    }
    const worksheet = workbook.Sheets[sheetName]
    records = XLSX.utils.sheet_to_json(worksheet)
  } else {
    // Parse CSV file with utf-8 encoding
    const fileContent = fs.readFileSync(filePath, "utf-8")
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  }

  const transactions: ParsedTransaction[] = []

  for (const record of records) {
    // Skip if missing essential data
    if (!record.Period || !record.USD) {
      continue
    }

    // Skip "Modified Balance" entries (initial balance markers)
    const category = cleanCategory(record.Category as string | undefined)
    if (category.toLowerCase().includes("modified") || category.toLowerCase().includes("balance")) {
      console.log('Skipping initial balance entry:', record.Period, category)
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
      console.error("Error parsing row:", error, record)
      // Continue processing other rows
    }
  }

  // Clean up uploaded file
  fs.unlinkSync(filePath)

  return transactions
}
