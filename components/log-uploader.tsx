"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LogUploaderProps } from "@/lib/types"

export function LogUploader({ onFileProcessed }: LogUploaderProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (): void => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File): void => {
    setFileName(file.name)
    setIsProcessing(true)

    const reader = new FileReader()

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const content = e.target?.result || null
      if (typeof content === "string") {
        onFileProcessed(content)
      } else {
        console.error("Error: File content is not a string")
      }
      setIsProcessing(false)
    }

    reader.onerror = (): void => {
      console.error("Error reading file")
      setIsProcessing(false)
    }

    reader.readAsText(file)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center ${
        isDragging ? "border-primary bg-primary/10" : "border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Drag and drop your log file, or click to browse</p>
          <p className="text-xs text-muted-foreground">Supports text log files</p>
        </div>

        <input type="file" id="file-upload" className="hidden" accept=".txt,.log" onChange={handleFileChange} />

        <Button
          variant="outline"
          onClick={() => document.getElementById("file-upload")!.click()}
          disabled={isProcessing}
        >
          Select File
        </Button>

        {fileName && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>{fileName}</span>
          </div>
        )}

        {isProcessing && <p className="text-sm text-muted-foreground">Processing file...</p>}
      </div>
    </div>
  )
}
