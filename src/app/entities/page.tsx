'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Building2, Mail, Globe, Search, RefreshCw } from 'lucide-react'
import type { Entity, EntityType } from '@/types'
import { cn } from '@/lib/utils'

const TYPE_FILTERS: { label: string; value: EntityType | 'all'; icon: React.ElementType }[] = [
  { label: 'All', value: 'all', icon: Users },
  { label: 'People', value: 'person', icon: Users },
  { label: 'Organizations', value: 'organization', icon: Building2 },
  { label: 'Emails', value: 'email', icon: Mail },
  { label: 'URLs', value: 'url', icon: Globe },
]

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')
  const [search, setSearch] = useState('')

  const fetchEntities = useCallback(async (type?: EntityType | 'all') => {
    setLoading(true)
    try {
      const url = type && type !== 'all' ? `/api/entities?type=${type}` : '/api/entities'
      const res = await fetch(url)
      const data = await res.json()
      setEntities(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntities() }, [fetchEntities])

  const filtered = search
    ? entities.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : entities

  const typeCount = (type: EntityType | 'all') =>
    type === 'all' ? entities.length : entities.filter(e => e.type === type).length

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] shrink-0">
        <h1 className="text-sm font-semibold text-white">Entities</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 font-mono tabular-nums">{filtered.length} results</span>
          <Button size="sm" variant="ghost" onClick={() => fetchEntities(typeFilter)} aria-label="Refresh">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] shrink-0 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30 pointer-events-none" aria-hidden />
            <Input
              type="search"
              placeholder="Filter entities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              aria-label="Filter entities by name"
            />
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Filter by type">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => {
                  setTypeFilter(f.value)
                  fetchEntities(f.value)
                }}
                aria-pressed={typeFilter === f.value}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                  typeFilter === f.value
                    ? 'bg-white/[0.10] text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                )}
              >
                <f.icon className="size-3" aria-hidden />
                {f.label}
                <span className="font-mono text-[10px] text-white/30">{typeCount(f.value)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-5 rounded-full border-2 border-white/10 border-t-white animate-spin" aria-label="Loading…" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Users className="size-8 mx-auto mb-3 opacity-30" aria-hidden />
              <p className="text-sm">No entities found</p>
            </div>
          ) : (
            <table className="w-full text-sm" aria-label="Entity list">
              <thead className="sticky top-0 bg-black z-10">
                <tr className="border-b border-white/[0.06]">
                  <th scope="col" className="text-left px-6 py-2.5 text-[11px] text-white/30 font-medium uppercase tracking-wider">Name</th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] text-white/30 font-medium uppercase tracking-wider">Type</th>
                  <th scope="col" className="text-right px-6 py-2.5 text-[11px] text-white/30 font-medium uppercase tracking-wider tabular-nums">Mentions</th>
                  <th scope="col" className="text-right px-6 py-2.5 text-[11px] text-white/30 font-medium uppercase tracking-wider">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(entity => (
                  <tr key={entity.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-white/80 font-medium">{entity.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entity.type as EntityType}>{entity.type}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-white/50 tabular-nums">
                      {entity.mentionCount}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-white/30">
                      {new Date(entity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
