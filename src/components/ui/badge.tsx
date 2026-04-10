import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'person' | 'organization' | 'email' | 'url' | 'document' | 'neutral'
}

const variants = {
  person: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  organization: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  email: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  url: 'bg-green-500/10 text-green-400 border-green-500/20',
  document: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  neutral: 'bg-white/[0.06] text-white/60 border-white/[0.08]',
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
