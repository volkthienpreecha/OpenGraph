'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  // Focus trap & keyboard close
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className={cn(
        'relative z-10 w-full max-w-lg mx-4 rounded-xl border border-white/[0.08] bg-[#111] shadow-2xl',
        className
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 id="dialog-title" className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-white/40 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
