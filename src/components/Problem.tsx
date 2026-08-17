import { FadeUp, LineReveal } from './MotionText'

export function Problem() {
  return (
    <section id="problem" className="section-shell relative">
      <div className="page-columns" aria-hidden />

      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center py-24 md:py-32">
        <FadeUp delay={0} y={12}>
          <span className="relative mb-10 inline-block h-3 w-3 md:mb-14" aria-hidden>
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#c8c8c8]" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#c8c8c8]" />
          </span>
        </FadeUp>

        <h2 className="w-full px-5 font-sans text-[clamp(1.7rem,6.2vw,5rem)] font-medium uppercase leading-[1.12] tracking-[0.04em] text-[#111111] md:px-8">
          <span className="flex w-full justify-between">
            <LineReveal delay={0.05}>Классический</LineReveal>
            <LineReveal delay={0.12}>запуск</LineReveal>
          </span>
          <span className="flex w-full justify-between">
            <LineReveal delay={0.18}>сжигает</LineReveal>
            <LineReveal delay={0.24}>бюджет</LineReveal>
          </span>
          <span className="flex w-full items-center justify-between gap-4">
            <LineReveal delay={0.3}>
              <span className="whitespace-nowrap">до первой</span>
            </LineReveal>
            <FadeUp
              delay={0.38}
              y={10}
              className="flex w-[11rem] shrink-0 flex-col gap-1 text-left font-sans text-[10px] font-medium uppercase leading-[1.45] tracking-[0.06em] text-[#111111] sm:w-[13rem] md:w-[15.5rem] md:text-[12px]"
            >
              <span>Вы платите за сайт и креативы, не зная реакции ЛПР.</span>
              <span>A/B-тесты на живом трафике - это недели и слитый бюджет.</span>
              <span>Реклама уходит в молоко, а решение принимает рынок - только постфактум.</span>
            </FadeUp>
            <LineReveal delay={0.34}>заявки</LineReveal>
          </span>
        </h2>

        <FadeUp delay={0.45} y={8}>
          <span className="mt-16 inline-block h-2 w-2 rounded-full bg-black md:mt-20" aria-hidden />
        </FadeUp>
      </div>
    </section>
  )
}
