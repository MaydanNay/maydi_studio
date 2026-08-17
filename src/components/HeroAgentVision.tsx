import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PREVIEW_URL = '/mimora-preview/index.html?scan=3'

type RegionId = 'nav.bar' | 'h1.title' | 'p.lead' | 'button.cta' | 'button.ghost'

const REGIONS: RegionId[] = ['nav.bar', 'h1.title', 'p.lead', 'button.cta', 'button.ghost']

const AI_INSIGHTS: Record<
  RegionId,
  { label: string; verdict: string; status: 'ok' | 'warn' | 'risk' }
> = {
  'nav.bar': {
    label: 'навигация',
    verdict:
      'Логотип mimora и Sign in считываются как продукт. Меню широкое - HOME, PLATFORM, TEAM - оффер в шапке не держится.',
    status: 'ok',
  },
  'h1.title': {
    label: 'заголовок',
    verdict:
      '«Simulate reality before it happens» - сильный хук. Слово reality без цифры, срока или B2B в первые 3 секунды.',
    status: 'warn',
  },
  'p.lead': {
    label: 'подзаголовок',
    verdict:
      '«Run your decision through a synthetic world» объясняет цикл. Рядом нет «3 min» и цены, хотя они уже есть в меню.',
    status: 'warn',
  },
  'button.cta': {
    label: 'cta',
    verdict:
      '«Start simulating» - низкий порог. Холодному ЛПР не хватает результата у кнопки: 3 min, $1.5 или From $89/mo.',
    status: 'warn',
  },
  'button.ghost': {
    label: 'вторичный cta',
    verdict:
      '«What do we simulate?» уводит с первого экрана. Сильнее оставить один главный CTA и доказательство рядом.',
    status: 'warn',
  },
}

const STATUS_LABEL: Record<'ok' | 'warn' | 'risk', string> = {
  ok: 'OK',
  warn: 'WARN',
  risk: 'HIGH',
}

function isRegionId(value: unknown): value is RegionId {
  return typeof value === 'string' && REGIONS.includes(value as RegionId)
}

function ToolbarIcon({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center text-[#6e6e73] ${className}`}>
      {children}
    </span>
  )
}

export function HeroAgentVision() {
  const frameRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<RegionId>('button.cta')
  const [showSummary, setShowSummary] = useState(false)

  /* Ленивая загрузка iframe при появлении блока в viewport */
  useEffect(() => {
    const node = frameRef.current
    if (!node) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setSrc(PREVIEW_URL)
        io.disconnect()
      },
      { rootMargin: '400px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  /* Обработка postMessage от iframe */
  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (event.data?.source !== 'maydi-scan') return
      if (event.data.id === 'summary') {
        setShowSummary(true)
        return
      }
      if (isRegionId(event.data.id)) {
        setShowSummary(false)
        setActive(event.data.id)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  return (
    <div className="safari-window flex h-full w-full flex-col">
        <header className="safari-toolbar">
          <div className="safari-traffic" aria-hidden>
            <span className="safari-dot safari-dot--close" />
            <span className="safari-dot safari-dot--min" />
            <span className="safari-dot safari-dot--max" />
          </div>

          <div className="safari-nav" aria-hidden>
            <ToolbarIcon>
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                <path d="M8 1 2 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ToolbarIcon>
            <ToolbarIcon className="opacity-35">
              <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
                <path d="m1 1 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ToolbarIcon>
          </div>

          <div className="safari-url">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden>
              <rect x="1.25" y="5.5" width="7.5" height="5.25" rx="1.2" stroke="#8e8e93" strokeWidth="1.2" />
              <path d="M3.1 5.5V3.7a1.9 1.9 0 0 1 3.8 0V5.5" stroke="#8e8e93" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>mimora.io</span>
          </div>

          <div className="safari-actions" aria-hidden>
            <ToolbarIcon>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v7M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 9.5V12h10V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ToolbarIcon>
            <ToolbarIcon>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 4.2h11" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </ToolbarIcon>
          </div>
        </header>

        <div ref={frameRef} className="relative min-h-0 flex-1 bg-[#121212]">
          {src ? (
            <iframe
              src={src}
              title="mimora"
              className="pointer-events-none h-full w-full border-0"
              loading="lazy"
              scrolling="no"
              tabIndex={-1}
              allow="autoplay; encrypted-media"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setLoaded(true)}
            />
          ) : null}

          {!loaded ? (
            <div className="safari-loading">mimora.io</div>
          ) : null}

          {/* Сканирующая линия */}
          <div className="absolute inset-0 z-10" aria-hidden>
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-px bg-[rgba(196,132,106,0.7)] shadow-[0_0_8px_rgba(196,132,106,0.4)]"
              animate={{ top: ['22%', '78%', '22%'] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Оверлей итогового резюме */}
          <AnimatePresence>
            {showSummary && (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[rgba(10,10,10,0.92)] backdrop-blur-[2px]"
                aria-live="polite"
              >
                {/* Метка */}
                <p className="mb-4 font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.18em] text-[#C4846A]">
                  mimora · итог разбора
                </p>

                {/* Счётчики */}
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[28px] font-bold leading-none text-[#7fc47f]">1</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.14em] text-[#7fc47f]/70">OK</span>
                  </div>
                  <span className="text-[18px] text-[#444]">·</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[28px] font-bold leading-none text-[#C4846A]">4</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.14em] text-[#C4846A]/70">к доработке</span>
                  </div>
                </div>

                {/* Подпись */}
                <p className="max-w-[220px] text-center font-sans text-[11px] leading-[1.55] text-[#888]">
                  Даже наш собственный сайт проходит тот же честный тест — без поблажек.
                </p>

                {/* Декоративная линия прогресса */}
                <div className="mt-5 h-px w-16 overflow-hidden rounded-full bg-[#333]">
                  <motion.div
                    className="h-full bg-[#C4846A]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.6, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="safari-status">
          <AnimatePresence mode="wait">
            {showSummary ? (
              <motion.div
                key="summary-status"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.28 }}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <p className="safari-status__label">mimora · итог разбора</p>
                  <span className="safari-status__badge safari-status__badge--ok">DONE</span>
                </div>
                <p className="safari-status__text">1 OK · 4 к доработке — и это наш собственный сайт.</p>
              </motion.div>
            ) : (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.28 }}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <p className="safari-status__label">mimora · {AI_INSIGHTS[active].label}</p>
                  <span className={`safari-status__badge safari-status__badge--${AI_INSIGHTS[active].status}`}>
                    {STATUS_LABEL[AI_INSIGHTS[active].status]}
                  </span>
                </div>
                <p className="safari-status__text">{AI_INSIGHTS[active].verdict}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  )
}
