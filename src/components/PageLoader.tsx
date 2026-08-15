import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BRAND = 'maydi studio'
const TYPE_MS = 72
const PAUSE_AFTER_TYPE_MS = 420
const ZOOM_MS = 1400
const HOLD_BLACK_MS = 320
const FADE_OUT_MS = 520
const BG_SITE = '#1D1D1D'
const BG_LIGHT = '#EDEAE2'

type Phase = 'typing' | 'pause' | 'zoom' | 'hold' | 'exit' | 'done'

type PageLoaderProps = {
  onComplete: () => void
}

export function PageLoader({ onComplete }: PageLoaderProps) {
  const [phase, setPhase] = useState<Phase>('typing')
  const [typedLen, setTypedLen] = useState(0)
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })

  const lastCharRef = useRef<HTMLSpanElement>(null)
  const textRowRef = useRef<HTMLParagraphElement>(null)

  const typed = BRAND.slice(0, typedLen)
  const body = typed.slice(0, -1)
  const lastChar = typed.slice(-1)

  useEffect(() => {
    if (phase !== 'typing') return
    if (typedLen >= BRAND.length) {
      const t = window.setTimeout(() => setPhase('pause'), 80)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setTypedLen((n) => n + 1), TYPE_MS)
    return () => window.clearTimeout(t)
  }, [phase, typedLen])

  useEffect(() => {
    if (phase !== 'pause') return
    const t = window.setTimeout(() => setPhase('zoom'), PAUSE_AFTER_TYPE_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  useLayoutEffect(() => {
    if (phase !== 'zoom' || !lastCharRef.current || !textRowRef.current) return

    const char = lastCharRef.current.getBoundingClientRect()
    const row = textRowRef.current.getBoundingClientRect()

    setOrigin({
      x: char.left + char.width / 2 - row.left,
      y: char.top + char.height / 2 - row.top,
    })

    const coverScale = Math.max(
      (window.innerWidth / char.width) * 1.35,
      (window.innerHeight / char.height) * 1.35,
      48,
    )

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setScale(coverScale))
    })

    const t = window.setTimeout(() => setPhase('hold'), ZOOM_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'hold') return
    const t = window.setTimeout(() => setPhase('exit'), HOLD_BLACK_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'exit') return
    const t = window.setTimeout(() => {
      setPhase('done')
      onComplete()
    }, FADE_OUT_MS)
    return () => window.clearTimeout(t)
  }, [phase, onComplete])

  useEffect(() => {
    const fallback = window.setTimeout(onComplete, 6000)
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(fallback)
      document.body.style.overflow = ''
    }
  }, [onComplete])

  if (phase === 'done') return null

  const isZooming = phase === 'zoom' || phase === 'hold' || phase === 'exit'
  const bgDark = phase === 'hold' || phase === 'exit' || (phase === 'zoom' && scale >= 8)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center overflow-hidden"
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: FADE_OUT_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        aria-label="Загрузка"
      >
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundColor: bgDark ? BG_SITE : BG_LIGHT }}
          transition={{ duration: 0.25 }}
        />

        <div className="relative z-10 w-full px-[6vw] sm:px-[8vw]">
          <p
            ref={textRowRef}
            className="inline-block font-[family-name:var(--font-display)] text-[clamp(2.4rem,9vw,5.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-black will-change-transform"
            style={{
              transform: isZooming ? `scale(${scale})` : undefined,
              transformOrigin: isZooming ? `${origin.x}px ${origin.y}px` : undefined,
              transition:
                phase === 'zoom'
                  ? `transform ${ZOOM_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`
                  : undefined,
            }}
          >
            <span>{body}</span>
            <span ref={lastCharRef}>{lastChar}</span>
            {phase === 'typing' && typedLen < BRAND.length && (
              <span className="loader-caret ml-0.5 inline-block w-[3px] bg-black" aria-hidden />
            )}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
