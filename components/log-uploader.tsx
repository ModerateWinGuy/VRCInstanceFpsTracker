"use client"

import { useState } from "react"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LogUploader({ onFileProcessed }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file) => {
    setFileName(file.name)
    setIsProcessing(true)

    const reader = new FileReader()

    reader.onload = (e) => {
      const content = e.target.result
      onFileProcessed(content)
      setIsProcessing(false)
    }

    reader.onerror = () => {
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
          onClick={() => document.getElementById("file-upload").click()}
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

