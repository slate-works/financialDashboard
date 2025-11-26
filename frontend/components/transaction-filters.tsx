"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Transaction } from "@/types/transaction"
import { Search, CalendarIcon, Filter, X } from "lucide-react"
import { format } from "date-fns"

interface TransactionFiltersProps {
  transactions: Transaction[]
  onFilterChange: (filters: {
    categories: string[]
    dateRange: { from: Date | undefined; to: Date | undefined }
    searchText: string
    month?: string
  }) => void
}

export function TransactionFilters({ transactions, onFilterChange }: TransactionFiltersProps) {
  const [searchText, setSearchText] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedMonth, setSelectedMonth] = useState<string>("")

  const categories = Array.from(new Set(transactions.map((t) => t.category)))

  const months = Array.from(
    new Set(
      transactions.map((t) => {
        const date = new Date(t.date)
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      }),
    ),
  ).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })

  useEffect(() => {
    onFilterChange({
      categories: selectedCategories,
      dateRange,
      searchText,
      month: selectedMonth,
    })
  }, [selectedCategories, dateRange, searchText, selectedMonth])

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handleMonthClick = (month: string) => {
    setSelectedMonth(selectedMonth === month ? "" : month)
  }

  const clearFilters = () => {
    setSearchText("")
    setSelectedCategories([])
    setDateRange({ from: undefined, to: undefined })
    setSelectedMonth("")
  }

  const hasActiveFilters =
    searchText || selectedCategories.length > 0 || dateRange.from || dateRange.to || selectedMonth

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="pt-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Date Range and Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <CalendarIcon className="w-4 h-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="w-4 h-4" />
                Categories
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Filter by Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {months.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quick Filter by Month</p>
            <div className="flex flex-wrap gap-2">
              {months.map((month) => (
                <Button
                  key={month}
                  variant={selectedMonth === month ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMonthClick(month)}
                  className="transition-all"
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge key={category} variant="secondary" className="gap-1 pr-1">
                {category}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => toggleCategory(category)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
