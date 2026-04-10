'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadResult {
  document: { id: number; name: string; type: string }
  entitiesExtracted: number
  relationships: number
}

interface UploadZoneProps {
  onSuccess?: (result: UploadResult) => void
}

interface QueueItem {
  /** Unique per-upload id so two files with the same name don't collide. */
  id: string
  name: string
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'txt', 'md', 'csv'].includes(ext || '')) {
      setError(`Unsupported file: .${ext}. Use PDF, TXT, MD, or CSV.`)
      return
    }

    // Use a unique id per upload so identical filenames don't interfere
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setQueue(q => [...q, { id: uploadId, name: file.name }])

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onSuccess?.(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setQueue(q => q.filter(item => item.id !== uploadId))
    }
  }, [onSuccess])

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      await processFile(file)
    }
    setUploading(false)
  }, [processFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files: click or drag and drop PDF, TXT, MD, or CSV"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'border-2 border-dashed rounded-xl px-6 py-12 text-center cursor-pointer transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          dragging
            ? 'border-white/30 bg-white/[0.04]'
            : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]'
        )}
      >
        <Upload className="size-8 mx-auto mb-3 text-white/20" aria-hidden="true" />
        <p className="text-sm text-white/50 mb-1">
          Drop files here, or <span className="text-white/70">browse</span>
        </p>
        <p className="text-xs text-white/30">PDF, TXT, MD, CSV</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv"
        multiple
        className="sr-only"
        aria-label="File input"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p role="alert" className="text-xs text-red-400 px-1">{error}</p>
      )}

      {queue.length > 0 && (
        <ul className="space-y-1.5" aria-label="Upload queue" aria-live="polite">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] text-xs text-white/60">
              <span className="size-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" aria-hidden="true" />
              <File className="size-3.5 shrink-0 text-white/30" />
              <span className="truncate">{item.name}</span>
              <span className="ml-auto text-white/30">Processing&hellip;</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
