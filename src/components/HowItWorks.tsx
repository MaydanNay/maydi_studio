import { HeroAgentVision } from './HeroAgentVision'
import { Reveal, SectionShell } from './SectionShell'

export function HowItWorks() {
  return (
    <SectionShell
      id="how-it-works"
      title="Как это работает"
      lead="mimora читает лендинг как ЛПР - зона за зоной, с выводами по каждому блоку до запуска трафика."
      compact
    >
      <Reveal className="page-cell md:col-span-2">
        <div className="h-[min(420px,70vw)] overflow-hidden md:h-full md:min-h-[360px]">
          <HeroAgentVision />
        </div>
      </Reveal>
    </SectionShell>
  )
}
