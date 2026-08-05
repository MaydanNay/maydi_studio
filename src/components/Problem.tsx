import { motion } from 'framer-motion'
import { EyeOff, FlaskConical, TrendingDown } from 'lucide-react'

const problems = [
  {
    icon: EyeOff,
    title: 'Слепые гипотезы',
    body: 'Вы платите за сайт и креативы, не зная, как на них отреагирует реальный ЛПР (CFO, владелец бизнеса, директор).',
    code: '01',
  },
  {
    icon: FlaskConical,
    title: 'Дорогие A/B-тесты',
    body: 'Проверка каждой гипотезы на реальном рекламном трафике стоит недели времени и сотни тысяч тенге.',
    code: '02',
  },
  {
    icon: TrendingDown,
    title: 'Слив бюджета на старте',
    body: '80% рекламного бюджета уходит в молоко из-за неочевидных возражений в цене или текстах.',
    code: '03',
  },
]

export function Problem() {
  return (
    <section id="problem" className="border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Problem / Agitation
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Почему классический запуск таргета и сайтов сжигает ваш бюджет
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {problems.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-600 hover:bg-zinc-900/40"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center border border-zinc-800 text-zinc-400 transition-colors group-hover:border-zinc-600 group-hover:text-zinc-50">
                  <p.icon size={18} strokeWidth={1.5} />
                </div>
                <span className="font-mono text-xs text-zinc-600">{p.code}</span>
              </div>
              <h3 className="mb-3 text-lg font-medium tracking-tight text-zinc-50">{p.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
