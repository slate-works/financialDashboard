"use client"

import { useState } from "react"
import { Settings, Trash2, Moon, Sun, Database, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { API_URL } from "@/lib/config"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"

interface SettingsDialogProps {
  onDataCleared?: () => void
}

export function SettingsDialog({ onDataCleared }: SettingsDialogProps) {
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const handleClearDatabase = async () => {
    setIsClearing(true)
    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Database cleared",
          description: "All transactions have been deleted successfully.",
        })
        onDataCleared?.()
        setOpen(false)
      } else {
        throw new Error("Failed to clear database")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
      setShowClearDialog(false)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions`)
      const data = await response.json()

      if (data.success && data.transactions) {
        // Convert to CSV
        const transactions = data.transactions
        const headers = ["Date", "Description", "Category", "Type", "Amount"]
        const csvContent = [
          headers.join(","),
          ...transactions.map((t: any) =>
            [
              t.date,
              `"${t.description.replace(/"/g, '""')}"`,
              t.category,
              t.type,
              t.amount,
            ].join(",")
          ),
        ].join("\n")

        // Download file
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `transactions-export-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Export successful",
          description: "Your transactions have been exported to CSV.",
        })
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export transactions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isDarkMode = theme === "dark"

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your dashboard preferences and data
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Theme Toggle */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Appearance</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="dark-mode" className="cursor-pointer">
                    Dark Mode
                  </Label>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDarkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </div>

            <Separator />

            {/* Data Management */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Data Management</h3>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4" />
                Export Transactions (CSV)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </Button>
            </div>

            <Separator />

            {/* Database Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Database: SQLite (Local)</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              transactions from your database. You may want to export your data first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? "Clearing..." : "Clear Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
