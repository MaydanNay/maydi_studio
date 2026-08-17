import { useEffect, useRef, useState } from 'react'
import { sampleFluidColor } from './HeroFluidCanvas'

type BoxVariant = 'fill' | 'outline' | 'grid' | 'token'

type AgentBox = {
  x: number
  y: number
  w: number
  h: number
  variant: BoxVariant
  fill: string
  readoutA: string
  readoutB: string
  readoutC: string
  tokenLine?: string
  locked: boolean
}

const WEB_NODES = [
  'section#hero',
  'h1.title',
  'nav.menu',
  'button.cta',
  'p.lead',
  'div.card',
  'a.link',
  'span.token',
]

const TOKEN_FRAGMENTS = [
  'созда|ём|сайт',
  'сложн|ый|цикл',
  'mim|ora|n=100',
  'возраж|ение',
  'кон|вер|сия',
]

function pickVariant(x: number, y: number): BoxVariant {
  const h = Math.abs(Math.sin(x * 0.013 + y * 0.017))
  if (h < 0.25) return 'fill'
  if (h < 0.5) return 'outline'
  if (h < 0.75) return 'grid'
  return 'token'
}

function boxSize(x: number, y: number) {
  const s = 56 + Math.abs(Math.sin(x * 0.02) * Math.cos(y * 0.015)) * 48
  return { w: Math.round(s * 1.15), h: Math.round(s) }
}

type HeroAgentScannerProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  enabled?: boolean
}

export function HeroAgentScanner({ canvasRef, enabled = true }: HeroAgentScannerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: -999, y: -999 })
  const pos = useRef({ x: -999, y: -999 })
  const stillSince = useRef<number | null>(null)
  const pinGate = useRef(false)
  const [box, setBox] = useState<AgentBox | null>(null)
  const [pinned, setPinned] = useState<AgentBox[]>([])
  const raf = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const onMove = (e: MouseEvent) => {
      const layer = layerRef.current
      if (!layer) return
      const rect = layer.getBoundingClientRect()
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return
      }
      target.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onLeave = () => {
      target.current = { x: -999, y: -999 }
      stillSince.current = null
      pinGate.current = false
      setBox(null)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    const layer = layerRef.current
    layer?.addEventListener('mouseleave', onLeave)

    const tick = () => {
      const tx = target.current.x
      const ty = target.current.y

      if (tx > -500) {
        const dx = tx - pos.current.x
        const dy = ty - pos.current.y
        pos.current = {
          x: pos.current.x + dx * 0.14,
          y: pos.current.y + dy * 0.14,
        }

        const speed = Math.hypot(dx, dy)
        const now = performance.now()

        if (speed < 1.2) {
          if (stillSince.current === null) stillSince.current = now
        } else {
          stillSince.current = null
          pinGate.current = false
        }

        const locked = stillSince.current !== null && now - stillSince.current > 280
        const { w, h } = boxSize(pos.current.x, pos.current.y)
        const variant = pickVariant(pos.current.x, pos.current.y)
        const canvas = canvasRef.current
        const canvasRect = canvas?.getBoundingClientRect()
        const layerRect = layerRef.current?.getBoundingClientRect()
        let fill = '#5eb8cc'

        if (canvas && canvasRect && layerRect) {
          const cx =
            ((layerRect.left + pos.current.x - canvasRect.left) / canvasRect.width) * canvas.width
          const cy =
            ((layerRect.top + pos.current.y - canvasRect.top) / canvasRect.height) * canvas.height
          fill = sampleFluidColor(canvas, cx, cy)
        }

        const nodeIdx = Math.floor(Math.abs(Math.sin(pos.current.x * 0.031)) * WEB_NODES.length)
        const tokenIdx = Math.floor(Math.abs(Math.cos(pos.current.y * 0.027)) * TOKEN_FRAGMENTS.length)
        const tokenLine = TOKEN_FRAGMENTS[tokenIdx]

        const nextBox: AgentBox = {
          x: pos.current.x,
          y: pos.current.y,
          w,
          h,
          variant,
          fill,
          readoutA: pos.current.x.toFixed(5),
          readoutB: pos.current.y.toFixed(2),
          readoutC: WEB_NODES[nodeIdx],
          tokenLine,
          locked,
        }

        setBox(nextBox)

        if (locked && !pinGate.current) {
          pinGate.current = true
          setPinned((prev) => {
            const pin = { ...nextBox, readoutC: `${WEB_NODES[nodeIdx]} · lock` }
            if (prev.length >= 5) return [...prev.slice(1), pin]
            return [...prev, pin]
          })
        }
      }

      raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      layer?.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf.current)
    }
  }, [canvasRef, enabled])

  return (
    <div ref={layerRef} className="hero-agent-scanner" aria-hidden>
      {pinned.map((p, i) => (
        <AgentBoxView key={`pin-${i}-${p.readoutA}`} box={p} faded />
      ))}
      {box && <AgentBoxView box={box} />}
    </div>
  )
}

function AgentBoxView({ box, faded = false }: { box: AgentBox; faded?: boolean }) {
  return (
    <div
      className={`agent-box agent-box--${box.variant} ${box.locked ? 'agent-box--locked' : ''} ${faded ? 'agent-box--pinned' : ''}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        ['--agent-fill' as string]: box.fill,
      }}
    >
      <div className="agent-box__inner">
        {box.variant === 'fill' && <div className="agent-box__fill" />}
        {box.variant === 'token' && (
          <span className="agent-box__token font-mono">{box.tokenLine ?? 'tok|en'}</span>
        )}
        {box.variant === 'grid' && <div className="agent-box__grid-lines" />}
      </div>
      <div className="agent-box__readout font-mono">
        <span>{box.readoutA}</span>
        <span>{box.readoutB}</span>
        <span className="agent-box__node">{box.readoutC}</span>
      </div>
    </div>
  )
}
