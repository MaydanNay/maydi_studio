import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    q: 'Почему я должен доверять синтетическим AI-респондентам в mimora?',
    a: 'Нейросеть не гадает и не выдаёт случайные ответы. Мы задаём синтетическим ЛПР более 1000+ параметров контекста вашей ниши (от бюджета и размера компании до реальных бизнес-болей) и проверяем семантическую точность (score ≥ 0.75). Это симуляция поведения реальных покупателей на основе поведенческих матриц.',
  },
  {
    q: 'Как устроена оплата и этапы работы?',
    a: 'Работаем по схеме: 70% предоплата перед стартом архитектурной сборки и 30% перед публикацией готовой воронки на вашем домене. Все сроки и обязательства жёстко фиксируются в договоре.',
  },
  {
    q: 'На каком движке разрабатывается сайт-воронка?',
    a: 'Никаких медленных конструкторов и тяжёлых шаблонов. Мы пишем чистый, молниеносный код на современном стеке (React / Vite / Next.js / Tailwind CSS), который загружается за миллисекунды и готов к высоким нагрузкам.',
  },
  {
    q: 'Вы сами ведёте рекламные кампании в таргете после сдачи проекта?',
    a: 'Мы — студия высокой конверсии с фиксированным сроком сдачи (7–10 дней). Мы собираем сайт, выстраиваем воронку и сдаём вам 3–5 готовых, стресс-протестированных в mimora рекламных связок и креативов. Запуск трафика вы можете осуществить самостоятельно или передать вашему текущему медиабайеру/таргетологу.',
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-10 max-w-2xl sm:mb-12">
          <p className="mb-3 inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            <span className="h-1.5 w-1.5 bg-zinc-50" />
            Frequently Asked Questions
          </p>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Вопросы по архитектуре, срокам и гарантиям
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Закрываем главные сомнения перед стартом работы. Без агентской воды.
          </p>
        </div>

        <div className="border border-zinc-800">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={item.q}
                className={i > 0 ? 'border-t border-zinc-800' : undefined}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-4 px-4 py-5 text-left transition-colors hover:bg-zinc-900/40 sm:px-6 sm:py-6 focus:outline-none focus-visible:bg-zinc-900/50"
                >
                  <span className="flex gap-3 sm:gap-4">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-600">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium leading-snug tracking-tight text-zinc-50 sm:text-base">
                      {item.q}
                    </span>
                  </span>
                  <span className="mt-0.5 shrink-0 text-zinc-500">
                    {isOpen ? <Minus size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-zinc-800/60 px-4 pb-5 pt-4 text-sm leading-relaxed text-zinc-400 sm:px-6 sm:pb-6 sm:pl-[4.25rem] sm:pt-5">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
