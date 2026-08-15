import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineReveal, motionEase, staggerItem } from './MotionText'

const faqs = [
  {
    q: 'Почему доверять AI-респондентам mimora?',
    a: 'Более 1000 параметров контекста ниши и семантическая точность score ≥ 0.75 — симуляция поведения реальных ЛПР.',
  },
  {
    q: 'Как устроена оплата?',
    a: '70% предоплата перед стартом, 30% перед публикацией. Сроки фиксируются в договоре.',
  },
  {
    q: 'На каком стеке сайт?',
    a: 'React / Vite / Next.js / Tailwind — без конструкторов, загрузка за миллисекунды.',
  },
  {
    q: 'Ведёте рекламу после сдачи?',
    a: 'Сдаём 3–5 протестированных связок. Запуск — ваш или медиабайера.',
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="section-shell relative">
      <div className="page-columns" aria-hidden />

      <div className="page-grid relative z-10 py-20 md:py-28">
        <h2 className="mb-10 px-5 font-sans text-[clamp(1.6rem,4.2vw,3.15rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111] md:col-span-2 md:mb-0 md:px-8">
          <LineReveal delay={0.05}>Вопросы</LineReveal>
        </h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
          }}
          className="px-5 md:col-span-2 md:px-6 md:pr-8"
        >
          {faqs.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <motion.div key={item.q} variants={staggerItem}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-5 py-5 text-left md:py-6"
                >
                  <span className="font-sans text-[13px] font-medium uppercase leading-[1.45] tracking-[0.04em] text-[#111111] md:text-[15px]">
                    {item.q}
                  </span>
                  <span
                    className="mt-0.5 shrink-0 font-[family-name:var(--font-jetbrains)] text-[12px] text-[#6b6b6b] transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: motionEase }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[42ch] pb-5 font-sans text-[13px] font-medium leading-[1.85] tracking-[0.02em] text-[#111111]/70 md:pb-6 md:text-[14px]">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
