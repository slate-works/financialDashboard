import type { Transaction } from "@/types/transaction"

export function generateMockTransactions(): Transaction[] {
  const categories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills",
    "Healthcare",
    "Salary",
    "Freelance",
  ]
  const descriptions: Record<string, string[]> = {
    "Food & Dining": ["Grocery Store", "Restaurant", "Coffee Shop", "Fast Food"],
    Transportation: ["Gas Station", "Uber", "Public Transit", "Parking"],
    Shopping: ["Amazon", "Clothing Store", "Electronics", "Home Goods"],
    Entertainment: ["Movie Theater", "Streaming Service", "Concert", "Books"],
    Bills: ["Electric Bill", "Internet", "Phone Bill", "Rent"],
    Healthcare: ["Pharmacy", "Doctor Visit", "Health Insurance", "Gym Membership"],
    Salary: ["Monthly Salary", "Bonus"],
    Freelance: ["Client Payment", "Consulting Fee"],
  }

  const transactions: Transaction[] = []
  const today = new Date()

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    const isIncome = Math.random() > 0.7
    const category = isIncome
      ? Math.random() > 0.5
        ? "Salary"
        : "Freelance"
      : categories[Math.floor(Math.random() * (categories.length - 2))]

    const amount = isIncome ? Math.random() * 3000 + 2000 : Math.random() * 200 + 10

    const description = descriptions[category][Math.floor(Math.random() * descriptions[category].length)]

    transactions.push({
      id: `${date.getTime()}-${i}`,
      date: date.toISOString().split("T")[0],
      description,
      amount: isIncome ? amount : -amount,
      category,
      type: isIncome ? "income" : "expense",
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
