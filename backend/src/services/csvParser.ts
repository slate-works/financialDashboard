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
 * Remove emoji, icons, and problematic characters from category text
 * while preserving apostrophes and common punctuation
 */
function cleanCategory(raw: string | null | undefined): string {
  if (!raw) return "Uncategorized"
  // First fix common encoding issues
  let cleaned = cleanText(raw)
  // Remove emoji and other special Unicode characters but keep basic punctuation
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // Remove emoji
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "")   // Remove misc symbols
  // Keep letters, numbers, spaces, and common punctuation (including apostrophe)
  cleaned = cleaned.replace(/[^a-zA-Z0-9/&' -]+/g, "").trim()
  return cleaned || "Uncategorized"
}

/**
 * Clean special characters and fix encoding issues
 */
function cleanText(text: string): string {
  if (!text) return ""
  
  return text
    // Fix UTF-8 interpreted as Windows-1252 encoding issues
    .replace(/â€™/g, "'")   // Fix apostrophe (right single quote)
    .replace(/â€˜/g, "'")   // Fix left single quote
    .replace(/â€œ/g, '"')   // Fix left double quote
    .replace(/â€/g, '"')    // Fix right double quote
    .replace(/â€"/g, "-")   // Fix em dash
    .replace(/â€"/g, "-")   // Fix en dash
    .replace(/Ã¢â‚¬â„¢/g, "'") // Another apostrophe encoding
    .replace(/Ã¢â‚¬Å"/g, '"')  // Another quote encoding
    .replace(/Ã¢â‚¬/g, '"')    // Another quote encoding
    // Fix curly quotes/apostrophes to straight ones
    .replace(/[\u2018\u2019]/g, "'")  // Curly single quotes to straight
    .replace(/[\u201C\u201D]/g, '"')  // Curly double quotes to straight
    .replace(/[\u2013\u2014]/g, "-")  // En/em dash to hyphen
    // Fix double vertical line and other misencoded apostrophes
    .replace(/[\u2016]/g, "'")        // Double vertical line to apostrophe
    .replace(/[\u2015]/g, "-")        // Horizontal bar to hyphen
    .replace(/[\uFFFD]/g, "'")        // Replacement character to apostrophe (common for corrupted ')
    // Fix Excel-specific encoding issues
    .replace(/\u0092/g, "'")          // Windows-1252 right single quote
    .replace(/\u0091/g, "'")          // Windows-1252 left single quote
    .replace(/\u0093/g, '"')          // Windows-1252 left double quote
    .replace(/\u0094/g, '"')          // Windows-1252 right double quote
    .replace(/\u0096/g, "-")          // Windows-1252 en dash
    .replace(/\u0097/g, "-")          // Windows-1252 em dash
    // Additional patterns for corrupted apostrophes
    .replace(/['`´ʼʻˈˊ]/g, "'")       // Various quote-like characters to straight apostrophe
    .replace(/[""„‟]/g, '"')          // Various double quote characters
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
    if (!worksheet) {
      throw new Error(`Worksheet ${sheetName} not found`)
    }
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
