import { useEffect, useRef, type RefObject } from 'react'

const SAMPLE = 11
const VIEW = 96

const CLASSES = ['organism', 'iridescence', 'glyph', 'void', 'surface', 'particle'] as const
const VARIANTS = ['hatch', 'scan', 'grid', 'cross', 'brackets'] as const

function toHex(r: number, g: number, b: number) {
  return [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function mapPoint(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  video: HTMLVideoElement,
) {
  const rect = el.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return { x, y, vx: 0, vy: 0, relY: 0 }

  const scale = Math.max(rect.width / vw, rect.height / vh)
  const dw = vw * scale
  const dh = vh * scale
  const ox = (rect.width - dw) / 2
  const oy = (rect.height - dh) / 2

  return {
    x,
    y,
    vx: (x - ox) / scale,
    vy: (y - oy) / scale,
    relY: y / rect.height,
  }
}

function detect(x: number, y: number, relY: number) {
  const cellX = Math.floor(x / 88)
  const cellY = Math.floor(y / 64)
  const seed = cellX * 17 + cellY * 31
  const n = Math.abs(Math.sin(seed * 0.137) * 43758.5453)
  const frac = n - Math.floor(n)

  const nearType = relY > 0.72
  const w = nearType
    ? 120 + Math.floor(frac * 90)
    : 42 + Math.floor(frac * 110)
  const h = nearType
    ? 36 + Math.floor((1 - frac) * 48)
    : 32 + Math.floor(((seed * 3) % 7) * 16)

  return {
    w,
    h,
    variant: VARIANTS[seed % VARIANTS.length],
    cls: nearType ? 'glyph' : CLASSES[seed % CLASSES.length],
    id: `${nearType ? 'h1' : 'roi'}.${String(Math.abs(seed % 240)).padStart(3, '0')}`,
    score: (0.71 + (frac % 0.26)).toFixed(2),
  }
}

type HeroProbeProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLElement | null>
}

export function HeroProbe({ videoRef, containerRef }: HeroProbeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const idRef = useRef<HTMLSpanElement>(null)
  const classRef = useRef<HTMLSpanElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const hexRef = useRef<HTMLSpanElement>(null)
  const xRef = useRef<HTMLSpanElement>(null)
  const yRef = useRef<HTMLSpanElement>(null)
  const swatchRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    if (!mq.matches) return

    const container = containerRef.current
    const video = videoRef.current
    const root = rootRef.current
    const canvas = canvasRef.current
    const hud = hudRef.current
    if (!container || !video || !root || !canvas || !hud) return

    const view = canvas.getContext('2d')
    if (!view) return
    view.imageSmoothingEnabled = false

    const sample = document.createElement('canvas')
    sample.width = SAMPLE
    sample.height = SAMPLE
    const sctx = sample.getContext('2d', { willReadFrequently: true })
    if (!sctx) return
    sctx.imageSmoothingEnabled = false

    let raf = 0
    let pending: { clientX: number; clientY: number } | null = null

    const draw = () => {
      raf = 0
      const pt = pending
      if (!pt) return

      const mapped = mapPoint(pt.clientX, pt.clientY, container, video)
      const box = detect(mapped.x, mapped.y, mapped.relY)

      root.style.opacity = '1'
      root.style.width = `${box.w}px`
      root.style.height = `${box.h}px`
      root.style.transform = `translate3d(${mapped.x - box.w / 2}px, ${mapped.y - box.h / 2}px, 0)`
      hud.dataset.variant = box.variant

      const half = SAMPLE / 2
      sctx.clearRect(0, 0, SAMPLE, SAMPLE)
      sctx.drawImage(
        video,
        mapped.vx - half,
        mapped.vy - half,
        SAMPLE,
        SAMPLE,
        0,
        0,
        SAMPLE,
        SAMPLE,
      )
      view.clearRect(0, 0, VIEW, VIEW)
      view.drawImage(sample, 0, 0, VIEW, VIEW)

      const pixel = sctx.getImageData(Math.floor(half), Math.floor(half), 1, 1).data
      const hex = toHex(pixel[0], pixel[1], pixel[2])

      if (idRef.current) idRef.current.textContent = box.id
      if (classRef.current) classRef.current.textContent = box.cls
      if (scoreRef.current) scoreRef.current.textContent = box.score
      if (hexRef.current) hexRef.current.textContent = hex
      if (xRef.current) xRef.current.textContent = mapped.x.toFixed(2)
      if (yRef.current) yRef.current.textContent = mapped.y.toFixed(2)
      if (swatchRef.current) swatchRef.current.style.background = `#${hex}`
    }

    const onMove = (e: MouseEvent) => {
      pending = { clientX: e.clientX, clientY: e.clientY }
      document.documentElement.dataset.heroProbe = '1'
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const onLeave = () => {
      pending = null
      root.style.opacity = '0'
      delete document.documentElement.dataset.heroProbe
    }

    container.addEventListener('mousemove', onMove)
    container.addEventListener('mouseleave', onLeave)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
      delete document.documentElement.dataset.heroProbe
    }
  }, [containerRef, videoRef])

  return (
    <div
      ref={rootRef}
      className="hero-probe pointer-events-none absolute left-0 top-0 z-30 hidden md:block"
      aria-hidden
    >
      <canvas ref={canvasRef} width={VIEW} height={VIEW} className="hero-probe__view" />

      <div ref={hudRef} className="hero-probe__hud" data-variant="scan">
        <span className="hero-probe__corner hero-probe__corner--tl" />
        <span className="hero-probe__corner hero-probe__corner--tr" />
        <span className="hero-probe__corner hero-probe__corner--bl" />
        <span className="hero-probe__corner hero-probe__corner--br" />
        <span className="hero-probe__cross-h" />
        <span className="hero-probe__cross-v" />
        <span className="hero-probe__scan" />
        <span className="hero-probe__hatch" />
        <span className="hero-probe__grid" />
      </div>

      <div className="hero-probe__meta">
        <span>
          id <span ref={idRef}>roi.000</span>
        </span>
        <span>
          cls <span ref={classRef}>void</span>
          <span className="mx-1.5 opacity-40">·</span>
          sc <span ref={scoreRef}>0.00</span>
        </span>
        <span className="hero-probe__row">
          <span ref={swatchRef} className="hero-probe__swatch" />
          <span ref={hexRef}>000000</span>
        </span>
        <span>
          x <span ref={xRef}>0.00</span>
          <span className="mx-1.5 opacity-40">·</span>
          y <span ref={yRef}>0.00</span>
        </span>
      </div>
    </div>
  )
}
