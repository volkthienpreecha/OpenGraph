'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { GraphData, GraphNode, GraphLink } from '@/types'

// SSR-safe import: react-force-graph-2d needs browser canvas APIs
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface GraphViewerProps {
  data: GraphData
  selectedNode?: GraphNode | null
  highlightNodes?: Set<string>
  onNodeClick?: (node: GraphNode) => void
  className?: string
}

export function GraphViewer({
  data,
  selectedNode,
  highlightNodes,
  onNodeClick,
  className,
}: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nodeCanvasObject = useCallback((
    node: object,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const n = node as GraphNode & { x: number; y: number }
    const label = n.name
    const fontSize = Math.max(10 / globalScale, 2)
    const r = n.val ?? 5

    const isSelected = selectedNode?.id === n.id
    const isHighlighted = highlightNodes?.has(n.id)

    // Glow for selected
    if (isSelected) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + 4, 0, 2 * Math.PI)
      const grad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + 8)
      grad.addColorStop(0, (n.color || '#fff') + '55')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = isSelected
      ? n.color || '#fff'
      : isHighlighted
        ? n.color || '#fff'
        : (n.color || '#fff') + 'cc'
    ctx.fill()

    // Border for selected
    if (isSelected || isHighlighted) {
      ctx.strokeStyle = n.color || '#fff'
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
    }

    // Label (only when zoomed in enough)
    if (globalScale > 0.8) {
      ctx.font = `${fontSize}px var(--font-geist-sans, system-ui, sans-serif)`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)'
      ctx.fillText(
        label.length > 24 ? label.slice(0, 22) + '…' : label,
        n.x,
        n.y + r + 2
      )
    }
  }, [selectedNode, highlightNodes])

  const linkColor = useCallback((link: object) => {
    const l = link as GraphLink
    if (highlightNodes && highlightNodes.has(l.source as string) && highlightNodes.has(l.target as string)) {
      return 'rgba(255,255,255,0.4)'
    }
    return 'rgba(255,255,255,0.06)'
  }, [highlightNodes])

  const linkWidth = useCallback((link: object) => {
    const l = link as GraphLink
    if (highlightNodes && highlightNodes.has(l.source as string) && highlightNodes.has(l.target as string)) {
      return 1.5
    }
    return Math.min(l.weight || 1, 4) * 0.5
  }, [highlightNodes])

  if (data.nodes.length === 0) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center ${className ?? 'h-full'}`}>
        <div className="text-center">
          <div className="text-white/20 text-4xl mb-3">⬡</div>
          <p className="text-sm text-white/30">No nodes yet.</p>
          <p className="text-xs text-white/20 mt-1">Upload documents to populate the graph.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className ?? 'h-full'}>
      <ForceGraph2D
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#000000"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkColor={linkColor}
        linkWidth={linkWidth}
        onNodeClick={(node) => onNodeClick?.(node as GraphNode)}
        nodeLabel={(node) => (node as GraphNode).name}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  )
}
