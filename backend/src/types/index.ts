export type TransactionType = "income" | "expense" | "transfer"

export interface Transaction {
  id: number
  date: string
  description: string
  category: string
  amount: number
  type: TransactionType
  account: string | null
  note: string | null
  createdAt: string
}
