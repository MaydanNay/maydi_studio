import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { captureLead, type LeadContext } from '../lib/leads'

type LeadModalProps = {
  open: boolean
  onClose: () => void
  context?: LeadContext | null
}

export function LeadModal({ open, onClose, context }: LeadModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const fromRoast = context?.source === 'ai_roaster'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-modal-title"
            className="relative w-full max-w-xl border border-zinc-800 bg-zinc-950 p-8 sm:p-10"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 text-zinc-500 transition-colors hover:text-zinc-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-50"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>

            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              {fromRoast ? 'Post-Roast · Strategic Call' : 'Strategic Call'}
            </p>
            <h2
              id="lead-modal-title"
              className="mb-3 max-w-md text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
            >
              {fromRoast
                ? 'Разберём эти возражения на созвоне'
                : 'Забронировать стратегический разбор'}
            </h2>
            <p className="mb-6 text-base leading-relaxed text-zinc-400">
              {fromRoast
                ? '15 минут с фаундерами. Принесём план, как закрыть дыры из AI-аудита до запуска трафика.'
                : '15 минут с фаундерами. Разберём ваш оффер, воронку и точки слива бюджета.'}
            </p>

            {fromRoast && context?.objectionTitles && context.objectionTitles.length > 0 && (
              <div className="mb-6 border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  roast attached · {context.roastSource || 'offer'}
                </p>
                <ul className="space-y-1.5">
                  {context.objectionTitles.map((title, i) => (
                    <li key={title} className="font-mono text-xs text-zinc-400">
                      {String(i + 1).padStart(2, '0')} · {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const data = new FormData(form)
                const name = String(data.get('name') || '').trim()
                const contact = String(data.get('contact') || '').trim()
                if (!name || !contact) return

                setSubmitting(true)
                setError(null)
                void captureLead({
                  name,
                  contact,
                  source: context?.source || 'booking',
                  roast_source: context?.roastSource,
                  objection_titles: context?.objectionTitles,
                  niche: context?.niche,
                  buyer_role: context?.buyerRole,
                })
                  .then(() => onClose())
                  .catch(() => {
                    setError('Не удалось отправить. Напишите напрямую в Telegram.')
                  })
                  .finally(() => setSubmitting(false))
              }}
            >
              <div>
                <label
                  htmlFor="lead-name"
                  className="mb-2 block font-mono text-xs uppercase tracking-wider text-zinc-500"
                >
                  Имя
                </label>
                <input
                  id="lead-name"
                  name="name"
                  required
                  disabled={submitting}
                  placeholder="Майдан"
                  className="w-full border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-base text-zinc-50 placeholder:text-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="lead-contact"
                  className="mb-2 block font-mono text-xs uppercase tracking-wider text-zinc-500"
                >
                  Telegram / WhatsApp
                </label>
                <input
                  id="lead-contact"
                  name="contact"
                  required
                  disabled={submitting}
                  placeholder="@MaydanMR / +77024383624"
                  className="w-full border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-base text-zinc-50 placeholder:text-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              {error && (
                <p className="font-mono text-xs text-zinc-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 bg-zinc-50 px-5 py-4 text-base font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </button>
            </form>

            <p className="mt-6 border-t border-zinc-800 pt-5 font-mono text-xs leading-relaxed text-zinc-600">
              Или напрямую:{' '}
              <a
                href="https://t.me/MaydanMR"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-50"
              >
                @MaydanMR
              </a>
              {' · '}
              <a
                href="https://t.me/chmahustle"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-50"
              >
                @chmahustle
              </a>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
