import { useEffect, useRef } from 'react'

/** Live film grain - redraws noise every frame so movement is always visible */
export function SiteGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let w = 0
    let h = 0
    let image: ImageData | null = null

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.ceil(window.innerWidth * dpr)
      h = Math.ceil(window.innerHeight * dpr)
      // keep canvas light: half-res then CSS scale
      const cw = Math.max(1, Math.floor(w * 0.45))
      const ch = Math.max(1, Math.floor(h * 0.45))
      canvas.width = cw
      canvas.height = ch
      image = ctx.createImageData(cw, ch)
    }

    const paint = () => {
      if (!image) return
      const { data } = image
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 28
      }
      ctx.putImageData(image, 0, 0)
    }

    resize()
    paint()

    if (!reduced) {
      const tick = () => {
        paint()
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9998] h-full w-full opacity-[0.22] mix-blend-multiply"
      aria-hidden
    />
  )
}
