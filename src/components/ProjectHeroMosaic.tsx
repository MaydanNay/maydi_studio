import { useEffect, useRef } from 'react'
import { useScroll } from 'framer-motion'

type ProjectHeroMosaicProps = {
  src: string
  title: string
  year: string
  role: string
  heroSize: string
  tone?: 'dark' | 'light'
  overlay?: string
  titleSpread?: boolean
}

function coverCrop(
  img: HTMLImageElement,
  w: number,
  h: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const ir = img.width / img.height
  const cr = w / h
  if (ir > cr) {
    const sw = img.height * cr
    return { sx: (img.width - sw) / 2, sy: 0, sw, sh: img.height }
  }
  const sh = img.width / cr
  return { sx: 0, sy: (img.height - sh) / 2, sw: img.width, sh }
}

function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function ProjectHeroMosaic({
  src,
  title,
  year: _year,
  role: _role,
  heroSize,
  tone = 'dark',
  overlay,
  titleSpread = false,
}: ProjectHeroMosaicProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const overlayRef = useRef<HTMLImageElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const thresholdsRef = useRef<Float32Array | null>(null)
  const gridRef = useRef({ cols: 0, rows: 0, cell: 18 })
  const reducedRef = useRef(false)
  const light = tone === 'light'

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    imgRef.current = img
    return () => {
      imgRef.current = null
    }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rebuildGrid = (w: number, h: number) => {
      const cell = Math.max(14, Math.round(Math.min(w, h) / 52))
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      gridRef.current = { cols, rows, cell }
      const thresholds = new Float32Array(cols * rows)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const rowBias = 1 - (y + 0.5) / rows
          thresholds[y * cols + x] = rowBias * 0.62 + hash2(x, y) * 0.38
        }
      }
      thresholdsRef.current = thresholds
    }

    const syncUi = (progress: number) => {
      const fade = Math.min(1, progress / 0.35)
      const titleFade = 1 - Math.max(0, (fade - 0.45) / 0.55)
      if (scrollerRef.current) scrollerRef.current.style.opacity = String(1 - fade)
      if (titleRef.current) titleRef.current.style.opacity = String(titleFade)
      if (overlayRef.current) overlayRef.current.style.opacity = String(titleFade)
    }

    const paint = (progress: number) => {
      const img = imgRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const nextW = Math.round(w * dpr)
      const nextH = Math.round(h * dpr)

      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW
        canvas.height = nextH
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        rebuildGrid(w, h)
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      syncUi(progress)

      if (!img || !img.complete || img.naturalWidth === 0) return

      const crop = coverCrop(img, w, h)
      const { cols, rows, cell } = gridRef.current
      const thresholds = thresholdsRef.current
      if (!thresholds) return

      if (reducedRef.current || progress >= 0.97) {
        ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h)
        return
      }

      const reveal = Math.min(1, progress / 0.78)
      const gapClose = progress > 0.78 ? Math.min(1, (progress - 0.78) / 0.19) : 0
      const gap = cell * 0.12 * (1 - gapClose)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (reveal < thresholds[y * cols + x]) continue

          const dx = x * cell + gap * 0.5
          const dy = y * cell + gap * 0.5
          const dw = Math.max(0.5, cell - gap)
          const dh = Math.max(0.5, cell - gap)

          const sx = crop.sx + ((x * cell) / w) * crop.sw
          const sy = crop.sy + ((y * cell) / h) * crop.sh
          const sw = (cell / w) * crop.sw
          const sh = (cell / h) * crop.sh

          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
        }
      }
    }

    const onImg = () => paint(scrollYProgress.get())
    const img = imgRef.current
    if (img) {
      if (img.complete) onImg()
      else img.addEventListener('load', onImg)
    }

    const unsub = scrollYProgress.on('change', paint)
    paint(scrollYProgress.get())

    const onResize = () => paint(scrollYProgress.get())
    window.addEventListener('resize', onResize)

    return () => {
      unsub()
      window.removeEventListener('resize', onResize)
      img?.removeEventListener('load', onImg)
    }
  }, [scrollYProgress, src])

  return (
    <div ref={trackRef} className="relative h-[240vh]">
      <div
        className={`sticky top-0 h-dvh overflow-hidden ${
          light ? 'bg-[#f2f2f2]' : 'bg-[#0a0a0a]'
        }`}
      >
        <h1
          ref={titleRef}
          className={`pointer-events-none absolute z-10 font-[family-name:var(--font-brand)] font-extrabold uppercase leading-[0.72] ${
            light ? 'text-[#111111]' : 'text-[#ececec]'
          } ${
            titleSpread
              ? 'inset-x-0 top-[38%] flex w-full -translate-y-1/2 items-center justify-between tracking-[-0.06em]'
              : 'left-1/2 top-[40%] w-[96%] -translate-x-1/2 -translate-y-1/2 text-center tracking-[-0.04em]'
          }`}
          style={{ fontSize: `clamp(2.2rem, ${heroSize}, 12rem)` }}
          aria-label={title}
        >
          {titleSpread
            ? title.split('').map((letter, i) => (
                <span key={`${letter}-${i}`} className="inline-block">
                  {letter}
                </span>
              ))
            : title}
        </h1>

        {overlay ? (
          <img
            ref={overlayRef}
            src={overlay}
            alt=""
            className="pointer-events-none absolute left-1/2 top-[68%] z-[15] max-h-[min(58vh,520px)] w-auto max-w-[min(70vw,380px)] -translate-x-1/2 -translate-y-1/2 object-contain select-none"
            draggable={false}
          />
        ) : null}

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          aria-hidden
        />

        <div ref={scrollerRef} className="project-scroller z-30" aria-hidden>
          <span
            className={`mb-2 block font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] ${
              light ? 'text-[#111111]' : 'text-[#e8e8e8]'
            }`}
          >
            {light ? '[ скролл ]' : 'Scroll'}
          </span>
          <div
            className={`relative h-11 w-px overflow-hidden ${
              light ? 'bg-[#111111]/25' : 'bg-white/25'
            }`}
          >
            <div className={`project-scroller__bar ${light ? 'bg-[#111111]' : 'bg-[#e8e8e8]'}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
