import { motion } from 'framer-motion'

type PricingProps = {
  onBookCall: () => void
}

type PackageVariant = 'standard' | 'recommended' | 'enterprise'

type Package = {
  id: string
  name: string
  priceKzt: string
  priceUsd: string
  timeline: string
  badge?: string
  cta: string
  variant: PackageVariant
  features: string[]
}

const packages: Package[] = [
  {
    id: 'express',
    name: 'Express Launch',
    priceKzt: '700 000 ₸',
    priceUsd: '$1,500',
    timeline: 'Фиксированный срок 7–10 дней',
    cta: 'Выбрать пакет',
    variant: 'standard',
    features: [
      'Разработка высококонверсионного сайта-воронки',
      'Прогон 1 главного оффера через 100 ЛПР в mimora',
      'Отчёт по возражениям и доработка копирайта',
      'Базовая настройка аналитики',
    ],
  },
  {
    id: 'complete',
    name: 'Complete High-Ticket Funnel',
    priceKzt: '1 100 000 ₸',
    priceUsd: '$2,300',
    timeline: 'Фиксированный срок 7–10 дней',
    badge: 'Pro / Recommended',
    cta: 'Выбрать пакет',
    variant: 'recommended',
    features: [
      'Всё из Express Launch',
      'Глубокое AI-тестирование 3 ценовых и рекламных гипотез',
      'Полная настройка сквозной аналитики и CRM',
      'Подготовка 5 рекламных креативов и их стресс-тест в mimora до запуска',
      'Гарантия соблюдения сроков по договору',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise AI Ecosystem',
    priceKzt: '2 200 000 ₸',
    priceUsd: '$4,800',
    timeline: 'Индивидуальный спринт 14–20 дней',
    badge: 'Enterprise / Scale',
    cta: 'Обсудить проект',
    variant: 'enterprise',
    features: [
      'Всё из Complete High-Ticket Funnel',
      'Разработка многостраничной воронки или сложного веб-приложения',
      'Интеграция кастомного AI-агента или лид-бота в вашу воронку',
      'Симуляция конкурентной среды в mimora (сравнение с 3 конкурентами на 100+ ЛПР)',
      'Личный 30-дневный контроль конверсии фаундерами после запуска',
    ],
  },
]

export function Pricing({ onBookCall }: PricingProps) {
  return (
    <section id="pricing" className="border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Packages / DoD
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Пакетные решения с фиксированным сроком 7–10 дней
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
          {packages.map((pkg, i) => {
            const isRec = pkg.variant === 'recommended'

            return (
              <motion.article
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative flex flex-col border p-6 transition-colors sm:p-7 ${
                  isRec
                    ? 'border-zinc-50 bg-white text-zinc-950 lg:scale-[1.02] lg:z-10'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-50 hover:border-zinc-600'
                }`}
              >
                {pkg.badge && (
                  <span
                    className={`absolute -top-3 left-5 inline-flex px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                      isRec
                        ? 'border border-zinc-950 bg-zinc-950 text-zinc-50'
                        : 'border border-zinc-700 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    {pkg.badge}
                  </span>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-base font-medium tracking-tight sm:text-lg ${
                      isRec ? 'text-zinc-950' : 'text-zinc-50'
                    }`}
                  >
                    {pkg.name}
                  </h3>
                  <p
                    className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${
                      isRec ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    {pkg.timeline}
                  </p>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
                      {pkg.priceKzt}
                    </span>
                    <span className="font-mono text-sm text-zinc-500">/ {pkg.priceUsd}</span>
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-relaxed">
                      <span
                        className={`shrink-0 font-mono ${isRec ? 'text-zinc-500' : 'text-zinc-600'}`}
                      >
                        ▸
                      </span>
                      <span className={isRec ? 'text-zinc-700' : 'text-zinc-400'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={onBookCall}
                  className={`w-full px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isRec
                      ? 'bg-black text-white hover:bg-zinc-800 focus-visible:ring-zinc-950 focus-visible:ring-offset-white'
                      : 'border border-zinc-700 text-zinc-50 hover:border-zinc-50 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:ring-zinc-500 focus-visible:ring-offset-zinc-950'
                  }`}
                >
                  {pkg.cta}
                </button>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
