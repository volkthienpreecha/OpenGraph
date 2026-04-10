import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.04]',
          'px-3 py-2 text-sm text-white placeholder:text-white/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-white/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
