import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { HeroNodeCanvas } from './HeroNodeCanvas'

type HeroProps = {
  onBookCall: () => void
}

const techBar = [
  'Powered by mimora AI Engine',
  '100+ Synthetic ICP Matrix',
  '0% Zero Regression',
]

function useIsDesktopGraph() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return enabled
}

export function Hero({ onBookCall }: HeroProps) {
  const showGraph = useIsDesktopGraph()

  return (
    <section
      id="hero"
      className="relative flex min-h-[85vh] w-full flex-col justify-center overflow-hidden pt-14"
    >
      {showGraph ? <HeroNodeCanvas /> : null}

      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl px-6 py-20 sm:py-24 lg:px-12 lg:py-28">
        <div className="pointer-events-auto max-w-3xl text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400"
          >
            <span className="h-1.5 w-1.5 animate-pulse-dot bg-zinc-50" />
            AI-Powered Pre-Flight Audience Testing
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-3xl font-semibold leading-[1.15] tracking-tight text-zinc-50 sm:text-4xl md:text-5xl lg:text-[3.15rem]"
          >
            Создаём сайты, воронки, креативы с предварительным тестом ЦА в AI-симуляции.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            До запуска трафика прогоняем ваш оффер, цены и креативы через 100 синтетических ЛПР
            в платформе mimora и устраняем 95% возражений. Сдача проекта под ключ за 7 дней.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="#ai-roaster"
              className="inline-flex items-center justify-center gap-2 bg-zinc-50 px-5 py-3.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Получить бесплатный AI-аудит сайта
              <ArrowRight size={16} />
            </a>
            <button
              type="button"
              onClick={onBookCall}
              className="inline-flex items-center justify-center gap-2 border border-zinc-700 px-5 py-3.5 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-50 hover:bg-zinc-50/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Забронировать стратегический разбор
              <ArrowUpRight size={16} className="text-zinc-500" />
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 border-t border-zinc-900 pt-8"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Social Proof / Tech Stack
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {techBar.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 border border-zinc-800/80 bg-zinc-950/50 px-4 py-3"
              >
                <span className="font-mono text-[10px] text-zinc-600">▸</span>
                <span className="font-mono text-xs tracking-wide text-zinc-400">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
