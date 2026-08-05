import { useState } from 'react'
import { motion } from 'framer-motion'

const highlights = [
  <>
    Создатели AI-платформы симуляции ЛПР <span className="text-zinc-50">mimora</span>
  </>,
  <>Работаем напрямую с фаундерами и ЛПР без посредников</>,
  <>Сдача проектов под ключ с личным контролем качества</>,
]

export function Founders() {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <section id="founders" className="border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-10 max-w-2xl sm:mb-12">
          <p className="mb-3 inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-1.5 w-1.5 bg-zinc-50" />
            Founders & Architects
          </p>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Инженеры и создатели технологии, а не агентские менеджеры.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Мы лично проектируем архитектуру воронок и отвечаем за конверсию каждого проекта. Без
            глухих телефонов и джунов на субподряде.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-10"
        >
          {/* Photo — wider */}
          <div className="relative aspect-[4/3] overflow-hidden border border-zinc-800 bg-zinc-900 md:col-span-8 md:aspect-[16/10] md:min-h-[380px]">
            {!imgFailed ? (
              <img
                src="/founders.webp"
                alt="Maydan & Diana — co-founders of maydiStudio"
                className="absolute inset-0 h-full w-full object-cover grayscale contrast-125"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
                <div className="pointer-events-none absolute inset-0 opacity-40 grid-bg" />
                <div className="relative flex gap-3">
                  <span className="flex h-16 w-16 items-center justify-center border border-zinc-700 font-mono text-lg font-medium text-zinc-400">
                    M
                  </span>
                  <span className="flex h-16 w-16 items-center justify-center border border-zinc-700 font-mono text-lg font-medium text-zinc-400">
                    D
                  </span>
                </div>
                <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  public/founders.webp
                </p>
              </div>
            )}
          </div>

          {/* Bio — narrower, no outline */}
          <div className="flex flex-col justify-center md:col-span-4">
            <p className="mb-4 font-mono text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-zinc-50 sm:text-xs">
              MAYDAN & DIANA — CO-FOUNDERS, TECH LEAD & FRONTEND ARCHITECT
            </p>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              «Мы — технические фаундеры и авторы AI-движка mimora. Устали смотреть, как классические
              маркетинговые агентства сжигают бюджеты клиентов на слепые A/B-тесты. Объединили
              глубокий инженерный опыт в Full-Stack разработке и собственную технологию симуляции
              аудиторий, чтобы создавать воронки с предсказуемой конверсией.»
            </p>
            <ul className="space-y-2.5">
              {highlights.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-400">
                  <span className="shrink-0 font-mono text-zinc-600">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
