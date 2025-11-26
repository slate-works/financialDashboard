"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileText, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadDialogProps {
  onFileUpload: (file: File) => void
}

export function UploadDialog({ onFileUpload }: UploadDialogProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setUploadedFile(file)
    onFileUpload(file)
    toast({
      title: "File uploaded successfully",
      description: `${file.name} has been processed`,
    })
    setOpen(false)
  }

  const clearFile = () => {
    setUploadedFile(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Upload className="w-4 h-4" />
          Upload Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Transaction Data</DialogTitle>
          <DialogDescription>
            Import your transaction history from a CSV file to analyze your spending patterns.
          </DialogDescription>
        </DialogHeader>

        {!uploadedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="dialog-file-upload"
              accept=".csv"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="dialog-file-upload" className="cursor-pointer">
                  Select File
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">CSV format: date, description, amount, category</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
