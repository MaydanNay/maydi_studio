import { forwardRef, useEffect, useRef, type RefObject } from 'react'
import butterflySrc from '../assets/butterfly.mp4'
import { SmartScanner } from './SmartScanner'
import { FadeUp, LetterReveal, WordReveal } from './MotionText'

type HeroProps = {
  onBookCall: () => void
}

const LoopVideo = forwardRef<HTMLVideoElement, { className?: string }>(
  function LoopVideo({ className }, ref) {
    const innerRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
      const video =
        (ref && typeof ref !== 'function' ? ref.current : null) ?? innerRef.current
      if (!video) return

      let raf = 0
      let cancelled = false

      const tick = () => {
        if (cancelled) return
        raf = requestAnimationFrame(tick)

        const duration = video.duration
        if (!Number.isFinite(duration) || duration < 0.3 || video.readyState < 2) return

        const t = video.currentTime
        const wrapAt = duration - 0.12
        const speedFrom = duration * 0.7

        if (t >= wrapAt) {
          video.playbackRate = 1
          video.currentTime = 0.03
          return
        }

        if (t >= speedFrom) {
          const p = Math.min(1, (t - speedFrom) / (wrapAt - speedFrom))
          video.playbackRate = 1 + p * 1.1
        } else if (video.playbackRate !== 1) {
          video.playbackRate = 1
        }
      }

      const start = () => {
        if (cancelled) return
        video.playbackRate = 1
        void video.play().catch(() => {})
        raf = requestAnimationFrame(tick)
      }

      if (video.readyState >= 2) start()
      else video.addEventListener('loadeddata', start, { once: true })

      return () => {
        cancelled = true
        cancelAnimationFrame(raf)
      }
    }, [ref])

    return (
      <video
        ref={(node) => {
          innerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        className={className}
        src={butterflySrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
    )
  },
)

export function Hero({ onBookCall: _onBookCall }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <section id="hero" className="relative w-full bg-[#F3F3F3] text-white">
      <div
        ref={stageRef}
        className="relative h-svh min-h-svh w-full overflow-hidden bg-[#F3F3F3]"
      >
        <LoopVideo
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />

        <span
          className="pointer-events-none absolute left-5 top-6 z-20 h-2 w-2 rounded-full bg-[#F3F3F3] md:left-8 md:top-8"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-5 top-6 z-20 h-2 w-2 rounded-full bg-[#F3F3F3] md:right-8 md:top-8"
          aria-hidden
        />

        <h1 className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex w-full items-end justify-between font-[family-name:var(--font-brand)] text-[16.5vw] font-extrabold leading-[0.72] text-[#F3F3F3]">
          <LetterReveal text="MAYDI" className="flex w-full items-end justify-between" delay={0.35} />
        </h1>

        <SmartScanner
          videoRef={videoRef as RefObject<HTMLVideoElement | null>}
          containerRef={stageRef as RefObject<HTMLElement | null>}
        />
      </div>

      <div className="blueprint relative -mt-px text-[#111111]">
        <div className="page-columns" aria-hidden />
        <div className="relative z-10 grid min-h-[70vh] grid-cols-1 px-6 py-24 md:grid-cols-4 md:px-0 md:py-32">
          <div className="flex flex-col items-center justify-center text-center md:col-span-2 md:col-start-2 md:px-10">
            <FadeUp delay={0.05}>
              <p className="mb-8 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.28em] text-[#6b6b6b]">
                Maydi Studio
              </p>
            </FadeUp>
            <p className="max-w-[36rem] font-sans text-[13px] font-medium uppercase leading-[1.85] tracking-[0.06em] text-[#111111] md:text-[15px]">
              <WordReveal
                text="Мы собираем сайты, воронки и креативы для B2B. Каждую гипотезу тестируем на синтетической ЦА в AI-симуляции mimora — до запуска трафика. Вы работаете напрямую с фаундерами, без агентской прослойки."
                delay={0.1}
                stagger={0.025}
              />
            </p>
            <FadeUp delay={0.45} y={10}>
              <span className="mt-12 inline-block h-2 w-2 rounded-full bg-black" aria-hidden />
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  )
}
