'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'touch-action-manipulation',
          {
            'bg-white text-black hover:bg-white/90 active:bg-white/80': variant === 'primary',
            'bg-white/[0.06] text-white hover:bg-white/[0.10] border border-white/[0.08] active:bg-white/[0.04]': variant === 'secondary',
            'text-white/70 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.04]': variant === 'ghost',
            'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20': variant === 'danger',
          },
          {
            'h-7 px-3 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-10 px-5 text-sm': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            <span>{children}&hellip;</span>
          </>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
