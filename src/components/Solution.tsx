import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { HeroAgentVision } from './HeroAgentVision'
import { LineReveal, WordReveal, staggerItem } from './MotionText'

const steps = [
  {
    title: 'Сборка воронки',
    body: 'Сайт и логика воронки за 4–5 дней — без шаблонов.',
  },
  {
    title: 'AI-фокус-группа',
    body: '100 синтетических B2B-респондентов в mimora, score ≥ 0.75.',
  },
  {
    title: 'Стресс-тест',
    body: 'Убираем возражения — потом открываем трафик.',
  },
]

function PreviewPin() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [fromScale, setFromScale] = useState(0.44)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const scale = useTransform(scrollYProgress, [0, 0.68, 0.86], [fromScale, 1, 1])

  useEffect(() => {
    const sync = () => setFromScale(window.innerWidth < 768 ? 0.7 : 0.42)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return (
    <div ref={trackRef} id="how-it-works" className="relative h-[280vh]">
      <div className="sticky top-0 z-10 flex h-dvh w-full flex-col px-3 pb-3 pt-16 md:px-6 md:pb-5">
        <div className="page-columns" aria-hidden />
        <motion.div
          style={{ scale }}
          className="relative z-10 min-h-0 w-full flex-1 origin-center will-change-transform"
        >
          <HeroAgentVision />
        </motion.div>
      </div>
    </div>
  )
}

export function Solution() {
  return (
    <>
      <section id="solution" className="section-shell relative">
        <div className="page-columns" aria-hidden />

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col px-5 py-20 md:px-8 md:py-28">
          <header className="mx-auto mb-12 max-w-[36rem] text-center md:mb-16">
            <h2 className="font-sans text-[clamp(1.6rem,4.2vw,3.15rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111]">
              <LineReveal delay={0.05}>Тест до первого клика</LineReveal>
            </h2>
            <p className="mx-auto mt-5 max-w-[28rem] font-sans text-[13px] font-medium uppercase leading-[1.85] tracking-[0.06em] text-[#111111] md:text-[15px]">
              <WordReveal
                text="Mimora читает лендинг как ЛПР — зона за зоной, до запуска трафика."
                delay={0.15}
                stagger={0.035}
              />
            </p>
          </header>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.article
              variants={staggerItem}
              className="relative flex min-h-[220px] flex-col justify-end border border-[#111111] bg-[#e8e8e8] p-5 md:aspect-square md:min-h-0 md:p-6"
            >
              <ArrowUpRight
                className="absolute right-5 top-5 h-5 w-5 text-[#111111] md:right-6 md:top-6"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="font-sans text-[clamp(1rem,1.6vw,1.25rem)] font-medium uppercase leading-[1.15] tracking-[0.04em] text-[#111111]">
                Как это
                <br />
                работает
              </h3>
            </motion.article>

            {steps.map((step) => (
              <motion.article
                key={step.title}
                variants={staggerItem}
                className="flex min-h-[220px] flex-col justify-between border border-[#111111] bg-[#f3f3f3] p-5 md:aspect-square md:min-h-0 md:p-6"
              >
                <h3 className="font-sans text-[clamp(1rem,1.6vw,1.25rem)] font-medium uppercase leading-[1.15] tracking-[0.04em] text-[#111111]">
                  {step.title}
                </h3>
                <p className="font-sans text-[12px] font-medium uppercase leading-[1.7] tracking-[0.06em] text-[#111111] md:text-[13px]">
                  {step.body}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>
      <PreviewPin />
    </>
  )
}
