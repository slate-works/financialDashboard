"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import {
  Moon,
  Sun,
  Monitor,
  Trash2,
  Download,
  Database,
  Palette,
  Bell,
  Shield,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { useData } from "@/lib/data-context"
import { getApiUrl } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { transactions, handleDataCleared } = useData()
  const { toast } = useToast()

  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Local settings state
  const [notifications, setNotifications] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  const handleClearDatabase = async () => {
    setIsClearing(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/transactions`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Data cleared",
          description: "All transactions have been deleted successfully.",
        })
        handleDataCleared()
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
    if (transactions.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No transactions available to export.",
      })
      return
    }

    setIsExporting(true)
    try {
      const headers = ["Date", "Description", "Category", "Type", "Amount"]
      const csvContent = [
        headers.join(","),
        ...transactions.map((t) =>
          [
            t.date,
            `"${t.description.replace(/"/g, '""')}"`,
            t.category,
            t.type,
            t.amount,
          ].join(",")
        ),
      ].join("\n")

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
        title: "Export complete",
        description: `${transactions.length} transactions exported to CSV.`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences and data"
      />

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the dashboard looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label>Theme</Label>
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="light"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                  >
                    <Sun className="mb-2 size-6" />
                    Light
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="dark"
                    id="dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="dark"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                  >
                    <Moon className="mb-2 size-6" />
                    Dark
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="system"
                    id="system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="system"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                  >
                    <Monitor className="mb-2 size-6" />
                    System
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing and padding for denser layouts
                </p>
              </div>
              <Switch
                id="compact"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure alerts and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for upcoming bills and budget updates
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Notification settings are stored locally and will reset on page refresh (demo mode).
            </p>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export, import, and manage your financial data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Database className="size-4 text-muted-foreground" />
                <span className="font-medium">Database: SQLite (Local)</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactions.length} transactions stored
              </p>
            </div>

            {/* Export */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportData}
              disabled={isExporting || transactions.length === 0}
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export Transactions (CSV)
            </Button>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-3">
              <h4 className="font-medium text-destructive">Danger Zone</h4>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="size-4" />
                Clear All Data
              </Button>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. All transactions will be permanently deleted.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Your data stays on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-success/5 border-success/20 p-4">
              <h4 className="font-medium text-success">Self-Hosted & Private</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                This dashboard runs entirely on your own infrastructure. No data is sent
                to external servers. All transactions are stored locally in your SQLite
                database.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Finance Dashboard</strong> — A
              self-hosted personal finance tracker
            </p>
            <p>
              Built with Next.js, Tailwind CSS, and SQLite. Designed for clarity
              and usability.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all{" "}
              {transactions.length} transactions from your database. You may want
              to export your data first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear All Data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
