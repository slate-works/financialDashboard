"use client"

import { useState, useCallback } from "react"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useData } from "@/lib/data-context"
import { formatDate } from "@/lib/format"

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error"

export default function ImportPage() {
  const { handleFileUpload, importMeta } = useData()

  const [state, setState] = useState<UploadState>("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setState("dragging")
    } else if (e.type === "dragleave") {
      setState("idle")
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return "Please upload a CSV file"
    }
    if (file.size > 10 * 1024 * 1024) {
      return "File size must be less than 10MB"
    }
    return null
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState("idle")

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const error = validateFile(file)
      if (error) {
        setErrorMessage(error)
        setState("error")
        return
      }
      setSelectedFile(file)
      processFile(file)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const error = validateFile(file)
      if (error) {
        setErrorMessage(error)
        setState("error")
        return
      }
      setSelectedFile(file)
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setState("uploading")
    setUploadProgress(0)
    setErrorMessage(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      await handleFileUpload(file)
      setUploadProgress(100)
      setState("success")
    } catch (error) {
      setState("error")
      setErrorMessage("Failed to process file. Please check the format and try again.")
    } finally {
      clearInterval(progressInterval)
    }
  }

  const handleReset = () => {
    setState("idle")
    setSelectedFile(null)
    setUploadProgress(0)
    setErrorMessage(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Upload transaction history from CSV files"
      />

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Import transactions from your bank or financial app. Supported format: CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === "idle" || state === "dragging" ? (
            <div
              className={`relative rounded-lg border-2 border-dashed transition-colors ${
                state === "dragging"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".csv,text/csv"
                onChange={handleChange}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Upload className="size-8 text-primary" />
                </div>
                <p className="mb-2 text-sm font-medium">
                  {state === "dragging"
                    ? "Drop file here"
                    : "Drag and drop your CSV file here"}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  or click to browse files
                </p>
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select File
                  </label>
                </Button>
              </div>
            </div>
          ) : state === "uploading" ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing {selectedFile?.name}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Validating and importing transactions
              </p>
            </div>
          ) : state === "success" ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-success/10 p-4">
                  <CheckCircle className="size-8 text-success" />
                </div>
                <h3 className="font-semibold">Import Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your transactions have been imported
                </p>
              </div>
              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="size-5 text-success" />
                </div>
              )}
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset}>
                  Import Another File
                </Button>
              </div>
            </div>
          ) : state === "error" ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="size-8 text-destructive" />
                </div>
                <h3 className="font-semibold">Import Failed</h3>
                <p className="text-center text-sm text-muted-foreground">
                  {errorMessage || "Something went wrong"}
                </p>
              </div>
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* CSV Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected CSV Format</CardTitle>
          <CardDescription>
            Your file should follow this structure for best results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr>
                  <td className="py-2 pr-4">2025-01-15</td>
                  <td className="py-2 pr-4">Coffee Shop</td>
                  <td className="py-2 pr-4">Food & Dining</td>
                  <td className="py-2 pr-4">4.50</td>
                  <td className="py-2">expense</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">2025-01-14</td>
                  <td className="py-2 pr-4">Monthly Salary</td>
                  <td className="py-2 pr-4">Salary</td>
                  <td className="py-2 pr-4">5000.00</td>
                  <td className="py-2">income</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported date formats: YYYY-MM-DD, MM/DD/YYYY. Type should be "income" or
            "expense".
          </p>
        </CardContent>
      </Card>

      {/* Last Import Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-5" />
            Last Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          {importMeta.lastFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">File</span>
                <span className="font-medium">{importMeta.lastFile}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-medium">{importMeta.lastCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {importMeta.lastImportedAt
                    ? formatDate(importMeta.lastImportedAt)
                    : "--"}
                </span>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No imports yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
