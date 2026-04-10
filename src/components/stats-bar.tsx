'use client'

import { useEffect, useState } from 'react'

interface Stats {
  entities: number
  documents: number
  relationships: number
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      const [entRes, docRes] = await Promise.all([
        fetch('/api/entities'),
        fetch('/api/documents'),
      ])
      const [ents, docs] = await Promise.all([entRes.json(), docRes.json()])
      setStats({
        entities: Array.isArray(ents) ? ents.length : 0,
        documents: Array.isArray(docs) ? docs.length : 0,
        relationships: 0,
      })
    }
    load()
  }, [])

  if (!stats) return null

  return (
    <div className="flex items-center gap-4 text-xs text-white/40 font-mono tabular-nums">
      <span><span className="text-white/70">{stats.entities}</span> entities</span>
      <span className="text-white/10">·</span>
      <span><span className="text-white/70">{stats.documents}</span> documents</span>
    </div>
  )
}
