'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GitBranch, FileText, Users, Search, Merge } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Graph', icon: GitBranch },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/entities', label: 'Entities', icon: Users },
  { href: '/query', label: 'Query', icon: Search },
  { href: '/merge', label: 'Resolve', icon: Merge },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-[220px] shrink-0 border-r border-white/[0.06] bg-[#0a0a0a] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.06]">
        <div className="flex items-center justify-center size-6 rounded-md bg-white/[0.08]">
          <GitBranch className="size-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">OpenGraph</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                active
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-white/20 font-mono">v0.1.0-alpha</p>
      </div>
    </aside>
  )
}
