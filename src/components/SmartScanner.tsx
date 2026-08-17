import { useEffect, useRef, type RefObject } from 'react'

/** 4×5 bitmap digits - same glyphs as ULTRACOMBOS hero shader */
const GLYPH: number[] = [
  0x69996, 0x62227, 0xe168f, 0xe161e, 0x99711, 0xf8e1e, 0x68e96, 0xf1244, 0x69696, 0x69716,
]
const GLYPH_MINUS = 0x00700
const GLYPH_DOT = 0x00004

const SAMPLE = 11

type CellKind = 'crop' | 'arrows' | 'bars' | 'swatch'
type Metric = 'x' | 'y' | 'score'

type Cell = {
  kind: CellKind
  metric: Metric
  seed: number
  tx: number
  ty: number
  x: number
  y: number
}

function glyphBits(ch: string) {
  if (ch === '-') return GLYPH_MINUS
  if (ch === '.') return GLYPH_DOT
  const n = ch.charCodeAt(0) - 48
  return n >= 0 && n <= 9 ? GLYPH[n] : 0
}

function drawGlyph(ctx: CanvasRenderingContext2D, bits: number, x: number, y: number, z: number) {
  for (let py = 0; py < 5; py++) {
    for (let px = 0; px < 4; px++) {
      const b = py * 4 + (3 - px)
      if ((bits >> b) & 1) ctx.fillRect(x + px * z, y + py * z, z, z)
    }
  }
}

function drawFloat(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, z: number) {
  // Black halo so digits stay readable on any backdrop (no mix-blend)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  let cx = x
  for (const ch of text) {
    drawGlyph(ctx, glyphBits(ch), cx + 1, y + 1, z)
    cx += 5 * z
  }
  ctx.fillStyle = '#fff'
  cx = x
  for (const ch of text) {
    drawGlyph(ctx, glyphBits(ch), cx, y, z)
    cx += 5 * z
  }
}

function lum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function objectScore(r: number, g: number, b: number) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const sat = max === 0 ? 0 : (max - min) / max
  const bg = Math.hypot(r - 243, g - 243, b - 243) / 441
  return Math.min(0.99, sat * 0.52 + Math.min(1, bg * 1.35) * 0.48)
}

function mapVideo(
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
  if (!vw || !vh) return { x, y, vx: 0, vy: 0, ok: false }

  const scale = Math.max(rect.width / vw, rect.height / vh)
  const ox = (rect.width - vw * scale) / 2
  const oy = (rect.height - vh * scale) / 2
  return { x, y, vx: (x - ox) / scale, vy: (y - oy) / scale, ok: true }
}

function boxSize(t: number, mx: number, my: number, seed: number, vel: number) {
  const w =
    48 * (Math.abs(Math.sin(t * (0.21 + seed * 0.17) + mx * 0.012)) * 2.35 + 0.9)
  const h =
    36 * (Math.abs(Math.cos(t * (0.31 + seed * 0.13) + my * 0.01)) * 2.2 + 0.75)
  return {
    w: Math.round(Math.min(160, Math.max(52, w * vel))),
    h: Math.round(Math.min(120, Math.max(38, h * vel))),
  }
}

function randOffset(angle: { a: number }) {
  const n = 42 + Math.random() * 78
  angle.a += Math.random() * Math.PI * 0.4 + Math.PI * 0.35
  return {
    x: n * Math.cos(angle.a),
    y: n * Math.sin(angle.a) * 0.78,
  }
}

type SmartScannerProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLElement | null>
}

export function SmartScanner({ videoRef, containerRef }: SmartScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sample = document.createElement('canvas')
    sample.width = SAMPLE
    sample.height = SAMPLE
    const sctx = sample.getContext('2d', { willReadFrequently: true })
    if (!sctx) return
    sctx.imageSmoothingEnabled = false

    const mouse = { x: 0, y: 0, tx: -1, ty: -1, vx: 0, vy: 0 }
    const live = { on: false, alpha: 0 }
    const angle = { a: Math.random() * Math.PI * 2 }
    let lastScatter = { x: 0, y: 0 }
    let raf = 0
    let dpr = 1
    const start = performance.now()

    const cells: Cell[] = [
      { kind: 'crop', metric: 'x', seed: 1, tx: 56, ty: -48, x: 56, y: -48 },
      { kind: 'arrows', metric: 'y', seed: 2, tx: -64, ty: 8, x: -64, y: 8 },
      { kind: 'bars', metric: 'score', seed: 3, tx: 48, ty: 44, x: 48, y: 44 },
      { kind: 'swatch', metric: 'score', seed: 4, tx: -36, ty: -52, x: -36, y: -52 },
    ]

    const scatter = () => {
      cells.forEach((c) => {
        const o = randOffset(angle)
        c.tx = o.x
        c.ty = o.y
      })
    }

    const resize = () => {
      const r = container.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${r.height}px`
    }

    const setPos = (clientX: number, clientY: number) => {
      const r = container.getBoundingClientRect()
      // Only the first viewport band of the hero stage (video), not the text block below
      const stageH = Math.min(r.height, window.innerHeight)
      const inside =
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.top + stageH

      if (!inside) {
        if (live.on) {
          live.on = false
          delete document.documentElement.dataset.heroProbe
        }
        return
      }

      mouse.tx = clientX - r.left
      mouse.ty = clientY - r.top
      live.on = true
      document.documentElement.dataset.heroProbe = '1'

      const dist = Math.hypot(mouse.tx - lastScatter.x, mouse.ty - lastScatter.y)
      if (dist > r.width * 0.07) {
        lastScatter = { x: mouse.tx, y: mouse.ty }
        scatter()
      }
    }

    const onMove = (e: PointerEvent) => setPos(e.clientX, e.clientY)

    const onLeave = () => {
      live.on = false
      delete document.documentElement.dataset.heroProbe
    }

    const strokeBox = (x: number, y: number, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const t = (now - start) / 1000
      const r = container.getBoundingClientRect()
      const video = videoRef.current

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, r.width, r.height)

      if (mouse.tx < 0 && !live.on) return

      const lx = mouse.x
      const ly = mouse.y
      mouse.x += (mouse.tx - mouse.x) * 0.16
      mouse.y += (mouse.ty - mouse.y) * 0.16
      mouse.vx = mouse.x - lx
      mouse.vy = mouse.y - ly
      live.alpha += ((live.on ? 1 : 0) - live.alpha) * 0.18
      if (live.alpha < 0.03) return

      cells.forEach((c) => {
        c.x += (c.tx - c.x) * 0.13
        c.y += (c.ty - c.y) * 0.13
      })

      ctx.globalAlpha = live.alpha
      ctx.imageSmoothingEnabled = false

      let score = 0.08
      let gx = 0
      let gy = 0
      const cols = [0.25, 0.4, 0.3, 0.45]
      const swatches: [number, number, number][] = [
        [180, 180, 180],
        [160, 160, 160],
        [140, 140, 140],
        [120, 120, 120],
      ]

      if (video && video.readyState >= 2) {
        const mapped = mapVideo(r.left + mouse.x, r.top + mouse.y, container, video)
        if (mapped.ok) {
          const half = SAMPLE / 2
          sctx.clearRect(0, 0, SAMPLE, SAMPLE)
          try {
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
          } catch {
            // tainted / not ready - keep fallbacks
          }
          const pix = sctx.getImageData(0, 0, SAMPLE, SAMPLE).data
          const mid = (Math.floor(half) * SAMPLE + Math.floor(half)) * 4
          const rgb = [pix[mid], pix[mid + 1], pix[mid + 2]]
          score = objectScore(rgb[0], rgb[1], rgb[2])

          for (let row = 0; row < SAMPLE; row++) {
            for (let col = 0; col < SAMPLE; col++) {
              const i = (row * SAMPLE + col) * 4
              const L = lum(pix[i], pix[i + 1], pix[i + 2])
              gx += (col - half) * L
              gy += (row - half) * L
            }
          }

          for (let c = 0; c < 4; c++) {
            const px = Math.floor(((c + 0.5) / 4) * SAMPLE)
            const py = Math.floor(SAMPLE * (0.28 + c * 0.14))
            let sum = 0
            for (let row = 0; row < SAMPLE; row++) {
              const i = (row * SAMPLE + px) * 4
              sum += lum(pix[i], pix[i + 1], pix[i + 2])
            }
            cols[c] = sum / (SAMPLE * 255)
            const si = (py * SAMPLE + px) * 4
            swatches[c] = [pix[si], pix[si + 1], pix[si + 2]]
          }
        }
      }

      const vel = Math.min(1.5, 1 + Math.hypot(mouse.vx, mouse.vy) * 0.055)
      const ang = Math.atan2(gy, gx)
      const z = 2

      cells.forEach((c) => {
        const size = boxSize(t, mouse.x, mouse.y, c.seed, vel)
        const left = Math.round(mouse.x + c.x - size.w / 2)
        const top = Math.round(mouse.y + c.y - size.h / 2)

        // Dark plate behind crop/swatch so panels read on light frames
        if (c.kind === 'crop' || c.kind === 'swatch' || c.kind === 'bars') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.fillRect(left, top, size.w, size.h)
        }

        if (c.kind === 'crop') {
          ctx.drawImage(sample, left, top, size.w, size.h)
        }

        if (c.kind === 'arrows') {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)'
          ctx.lineWidth = 1
          const dx = Math.cos(ang) * 3.1
          const dy = Math.sin(ang) * 3.1
          for (let py = top + 6; py < top + size.h - 5; py += 8) {
            for (let px = left + 6; px < left + size.w - 5; px += 8) {
              ctx.beginPath()
              ctx.moveTo(px - dx, py - dy)
              ctx.lineTo(px + dx, py + dy)
              ctx.lineTo(px + dx - dy * 0.4, py + dy + dx * 0.4)
              ctx.stroke()
            }
          }
        }

        if (c.kind === 'bars') {
          const gap = 3
          const barW = (size.w - gap * 5) / 4
          for (let i = 0; i < 4; i++) {
            const bh = Math.max(4, cols[i] * (size.h - 8))
            ctx.fillStyle = '#fff'
            ctx.fillRect(left + gap + i * (barW + gap), top + size.h - 4 - bh, barW, bh)
          }
        }

        if (c.kind === 'swatch') {
          const gap = 3
          const sq = Math.min((size.w - gap * 5) / 4, size.h - 8)
          const oy = top + (size.h - sq) / 2
          for (let i = 0; i < 4; i++) {
            const [sr, sg, sb] = swatches[i]
            ctx.fillStyle = `rgb(${sr},${sg},${sb})`
            ctx.fillRect(left + gap + i * (sq + gap), oy, sq, sq)
            ctx.strokeStyle = '#fff'
            ctx.strokeRect(
              left + gap + i * (sq + gap) + 0.5,
              oy + 0.5,
              sq - 1,
              sq - 1,
            )
          }
        }

        strokeBox(left, top, size.w, size.h)

        const value =
          c.metric === 'x' ? mouse.x : c.metric === 'y' ? mouse.y : score
        const prec = c.metric === 'score' ? 2 : 5
        drawFloat(ctx, value.toFixed(prec), left + size.w + 8, top + 4, z)
      })

      ctx.globalAlpha = 1
    }

    resize()
    scatter()
    raf = requestAnimationFrame(tick)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('blur', onLeave)
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('blur', onLeave)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
      ro.disconnect()
      delete document.documentElement.dataset.heroProbe
    }
  }, [containerRef, videoRef])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30 block"
      aria-hidden
    />
  )
}
