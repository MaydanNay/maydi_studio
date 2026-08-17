import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const highlights = [
  'Создатели AI-платформы mimora',
  'Работа напрямую с фаундерами и ЛПР',
  'Сдача под ключ с личным контролем',
]

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

function PixelReveal({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const img = new Image()
    img.src = src
    img.onerror = () => setFailed(true)

    let raf = 0
    const off = document.createElement('canvas')

    const paint = (pixelSize: number) => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (w < 2 || h < 2 || !img.complete || img.naturalWidth === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const crop = coverCrop(img, w, h)
      const size = Math.max(1, pixelSize)
      const pw = Math.max(1, Math.round(w / size))
      const ph = Math.max(1, Math.round(h / size))
      off.width = pw
      off.height = ph
      const octx = off.getContext('2d')
      if (!octx) return
      octx.imageSmoothingEnabled = false
      octx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(off, 0, 0, w, h)
    }

    const run = () => {
      if (doneRef.current) return
      doneRef.current = true
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        paint(1)
        return
      }

      const from = 42
      const duration = 1600
      const t0 = performance.now()

      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration)
        const eased = 1 - (1 - t) ** 3
        paint(from + (1 - from) * eased)
        if (t < 1) raf = requestAnimationFrame(tick)
        else paint(1)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        if (img.complete) run()
        else img.onload = run
        io.disconnect()
      },
      { threshold: 0.2 },
    )
    io.observe(wrap)

    const ro = new ResizeObserver(() => {
      if (doneRef.current) paint(1)
    })
    ro.observe(wrap)

    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [src])

  if (failed) {
    return (
      <div className="flex h-full min-h-[320px] items-end bg-[#ececec] p-6">
        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">
          founders
        </p>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative h-full min-h-[50vh] w-full overflow-hidden bg-[#111111] md:min-h-0">
      <canvas ref={canvasRef} className="h-full w-full grayscale" role="img" aria-label={alt} />
    </div>
  )
}

export function Founders() {
  return (
    <section id="founders" className="section-shell relative min-h-svh">
      <div className="page-columns" aria-hidden />

      <div className="relative z-10 grid min-h-svh grid-cols-1 pt-16 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center px-5 py-16 md:px-8 md:py-24 lg:px-12"
        >
          <p className="mb-5 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[#6b6b6b]">
            Maydan & Diana
          </p>
          <h1 className="max-w-[12ch] font-sans text-[clamp(1.6rem,4.2vw,3.15rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111]">
            Инженеры и авторы технологии
          </h1>
          <p className="mt-6 max-w-[32rem] font-sans text-[13px] font-medium uppercase leading-[1.85] tracking-[0.06em] text-[#111111] md:text-[15px]">
            Объединили инженерный опыт и симуляцию аудиторий, чтобы воронки работали с
            предсказуемой конверсией - без слепых A/B-тестов на вашем бюджете.
          </p>
          <ul className="mt-10 flex flex-col gap-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.08em] text-[#6b6b6b]"
              >
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="min-h-[50vh] border-[#111111] md:min-h-0 md:border-l">
          <PixelReveal src="/founders.webp" alt="Maydan и Diana - co-founders maydiStudio" />
        </div>
      </div>
    </section>
  )
}
