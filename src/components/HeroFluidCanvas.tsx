import { useEffect, useRef } from 'react'

type RGB = [number, number, number]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

function fluidColor(x: number, y: number, t: number): RGB {
  const n1 = Math.sin(x * 0.011 + t * 0.0009) * Math.cos(y * 0.009 - t * 0.0007)
  const n2 = Math.sin((x + y) * 0.006 + t * 0.0011)
  const n3 = Math.cos(x * 0.007 - y * 0.008 + t * 0.0005)
  const n = (n1 + n2 + n3) / 3

  const orange: RGB = [210, 120, 55]
  const moss: RGB = [75, 110, 72]
  const pink: RGB = [220, 140, 160]
  const teal: RGB = [60, 150, 165]
  const deep: RGB = [35, 38, 42]

  if (n < -0.15) return mix(deep, moss, (n + 1) * 0.5)
  if (n < 0.25) return mix(moss, orange, (n + 0.15) / 0.4)
  if (n < 0.55) return mix(orange, pink, (n - 0.25) / 0.3)
  return mix(pink, teal, (n - 0.55) / 0.45)
}

type HeroFluidCanvasProps = {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
  className?: string
}

export function HeroFluidCanvas({ canvasRef: externalRef, className = '' }: HeroFluidCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = externalRef ?? internalRef
  const raf = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const cell = 6
    let w = 0
    let h = 0
    let gridW = 0
    let gridH = 0
    let imageData: ImageData | null = null

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      w = Math.floor(rect.width)
      h = Math.floor(rect.height)
      canvas.width = w
      canvas.height = h
      gridW = Math.ceil(w / cell)
      gridH = Math.ceil(h / cell)
      imageData = ctx.createImageData(gridW, gridH)
    }

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const start = performance.now()

    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d')

    const draw = (now: number) => {
      if (!imageData || !offCtx) {
        raf.current = requestAnimationFrame(draw)
        return
      }

      const t = now - start
      const { data } = imageData

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const px = gx * cell
          const py = gy * cell
          const [r, g, b] = fluidColor(px, py, t)
          const i = (gy * gridW + gx) * 4
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = 255
        }
      }

      offscreen.width = gridW
      offscreen.height = gridH
      offCtx.putImageData(imageData, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(offscreen, 0, 0, gridW, gridH, 0, 0, w, h)

      raf.current = requestAnimationFrame(draw)
    }

    raf.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className={`hero-fluid-canvas ${className}`} aria-hidden />
}

export function sampleFluidColor(canvas: HTMLCanvasElement | null, x: number, y: number): string {
  if (!canvas) return '#4a9eb5'
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#4a9eb5'
  const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)))
  const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)))
  const [r, g, b] = ctx.getImageData(px, py, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}
