import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'

const cases = [
  {
    id: '01',
    industry: 'B2B SaaS',
    title: 'Воронка под демо-заявку',
    blurb: 'Структура страницы и оффер собраны под ЛПР до запуска трафика.',
  },
  {
    id: '02',
    industry: 'High-ticket услуги',
    title: 'Лендинг под квалифицированный лид',
    blurb: 'Копирайт и логика воронки заточены под длинный цикл сделки.',
  },
  {
    id: '03',
    industry: 'Product launch',
    title: 'Pre-launch с тест-оффером',
    blurb: 'Гипотезы прогнаны через симуляцию аудитории до рекламного бюджета.',
  },
] as const

export function Cases() {
  return (
    <section id="cases" className="border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Cases / Proof
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Что уже собирали для рынка
            </h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-zinc-50">
              700+ проектов реализовано
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              Превью форматов работ. Полное портфолио — на maydi.net, пока копируем сюда свои кейсы
              maydiStudio.
            </p>
          </div>
          <a
            href="https://maydi.net"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:text-zinc-50"
          >
            Все на maydi.net
            <ArrowUpRight size={14} />
          </a>
        </div>

        <ul className="grid grid-cols-1 gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
          {cases.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="bg-zinc-950"
            >
              <a
                href="https://maydi.net"
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-50"
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b border-zinc-800 bg-zinc-900">
                  <div className="pointer-events-none absolute inset-0 opacity-50 grid-bg" />
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                      Case {item.id}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition-colors group-hover:text-zinc-300">
                      {item.industry}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-base font-medium tracking-tight text-zinc-50 transition-colors group-hover:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{item.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 transition-colors group-hover:text-zinc-50">
                    Смотреть
                    <ArrowUpRight
                      size={12}
                      className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </div>
              </a>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
