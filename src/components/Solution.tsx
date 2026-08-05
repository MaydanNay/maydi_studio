import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Сборка воронки',
    body: 'Разрабатываем быстрый, высококонверсионный сайт и выстраиваем логику воронки за 4–5 дней.',
  },
  {
    num: '02',
    title: 'AI-Фокус-группа из 100 ЛПР (mimora)',
    body: 'Генерируем 100 синтетических B2B-респондентов вашей ЦА с высокой семантической точностью (score ≥ 0.75).',
  },
  {
    num: '03',
    title: 'Стресс-тест и запуск',
    body: 'Устраняем выявленные AI-респондентами возражения в текстах/ценах и только после этого запускаем рекламный трафик.',
  },
]

export function Solution() {
  return (
    <section id="solution" className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Solution / Method
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Инженерный подход: тест гипотез ДО первого рекламного клика
          </h2>
        </div>

        <ol className="relative space-y-0 md:grid md:grid-cols-3 md:gap-0 md:space-y-0">
          {/* Desktop connector line */}
          <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-zinc-800 md:block" />

          {steps.map((step, i) => (
            <motion.li
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative border-l border-zinc-800 py-2 pl-6 md:border-l-0 md:border-t-0 md:px-6 md:pl-0 md:pt-0 first:md:pl-0 last:md:pr-0"
            >
              <div className="mb-5 flex items-center gap-3 md:flex-col md:items-start md:gap-4">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-700 bg-zinc-950 font-mono text-xs font-medium text-zinc-50">
                  {step.num}
                </span>
                <h3 className="text-lg font-medium tracking-tight text-zinc-50 md:mt-2">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 md:pr-4">{step.body}</p>
              {i < steps.length - 1 && (
                <div className="my-6 h-px w-full bg-zinc-800 md:hidden" />
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
