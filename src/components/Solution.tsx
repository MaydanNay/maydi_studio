import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { HeroAgentVision } from './HeroAgentVision'
import { LineReveal, WordReveal, staggerItem } from './MotionText'

const steps = [
  {
    title: 'Сборка воронки',
    body: 'Сайт и воронка за 7-10 дней - без шаблонов.',
  },
  {
    title: 'AI-фокус-группа',
    body: '100 AI-респондентов в mimora - с профилем вашей ЦА.',
  },
  {
    title: 'Стресс-тест',
    body: 'Убираем возражения - потом открываем трафик.',
  },
  {
    title: 'Запуск с уверенностью',
    body: 'Трафик идёт только на версию, которая уже прошла проверку — без слепых A/B на живых деньгах.',
  },
]

function PreviewPin() {
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const [fromScale, setFromScale] = useState(0.44)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  // Анимация окна — не трогаем
  const scale = useTransform(scrollYProgress, [0, 0.68, 0.86], [fromScale, 1, 1])
  // Текст «Как это работает»: плавно проваливается вниз и исчезает
  const textOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.14], [0, 80])

  // Caption: большой внизу → уменьшается → поднимается → фиксируется → исчезает за окном
  const captionFontSize = useTransform(
    scrollYProgress,
    [0, 0.24],
    ['clamp(1.1rem,2.2vw,1.7rem)', 'clamp(0.58rem,0.72vw,0.68rem)'],
  )
  // Поднимается вверх пока уменьшается, потом стоит на месте
  const captionY = useTransform(scrollYProgress, [0, 0.24, 0.42], [0, -60, -60])
  // Исчезает позже — когда окно уже почти на весь экран
  const captionOpacity = useTransform(scrollYProgress, [0.28, 0.42], [1, 0])
  const captionLetterSpacing = useTransform(
    scrollYProgress,
    [0, 0.24],
    ['0.02em', '0.13em'],
  )

  // Entrance-анимация: срабатывает когда блок входит во viewport
  const isInView = useInView(trackRef, { once: true, margin: '-10% 0px' })

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

        {/* «Как это работает» — исчезает быстро при скролле */}
        <motion.div
          ref={labelRef}
          style={{ opacity: textOpacity, y: textY }}
          className="absolute left-0 right-0 top-[4rem] z-[5] flex w-full justify-center px-5"
        >
          <motion.a
            href="https://mimora.io"
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: -16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="group flex items-center gap-3 font-sans text-[clamp(1.6rem,4.2vw,3.15rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111] hover:opacity-70 transition-opacity"
          >
            Как это работает
            <ArrowUpRight
              className="h-6 w-6 md:h-10 md:w-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              strokeWidth={1.5}
            />
          </motion.a>
        </motion.div>

        {/* Caption — ОТДЕЛЬНЫЙ контейнер: стартует ниже заголовка, уменьшается, поднимается, фиксируется, потом исчезает */}
        <motion.div
          style={{ opacity: captionOpacity, y: captionY }}
          className="absolute left-0 right-0 top-[8.5rem] z-[6] flex w-full justify-center px-5"
        >
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
            style={{
              fontSize: captionFontSize,
              letterSpacing: captionLetterSpacing,
            }}
            className="max-w-[720px] text-center font-[family-name:var(--font-jetbrains)] font-medium uppercase leading-[1.4] text-[#6b6b6b]"
          >
            <span className="mr-1.5 text-[#C4846A]" aria-hidden>►</span>
            Это реальный разбор нашего сайта mimora.io.
            {' '}Так AI видит любой лендинг, включая наш.
          </motion.p>
        </motion.div>

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
                text="Mimora читает лендинг как ЛПР - зона за зоной, до запуска трафика."
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

