import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Copy, Check, Loader2 } from 'lucide-react'
import { captureLead, type LeadContext } from '../lib/leads'
import type { RoastResult } from '../lib/roastStorage'

export type { RoastObjection, RoastResult } from '../lib/roastStorage'

type RoastResultModalProps = {
  open: boolean
  onClose: () => void
  result: RoastResult | null
  niche?: string
  buyerRole?: string
  onDownload: () => void
  onCopy: () => void
  downloadSaved: boolean
  copySaved: boolean
  onBookCall: (ctx?: LeadContext) => void
}

export function RoastResultModal({
  open,
  onClose,
  result,
  niche,
  buyerRole,
  onDownload,
  onCopy,
  downloadSaved,
  copySaved,
  onBookCall,
}: RoastResultModalProps) {
  const [leadName, setLeadName] = useState('')
  const [leadContact, setLeadContact] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

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
    if (!open || !result) return
    setLeadDone(false)
    setLeadError(null)
    setLeadName('')
    setLeadContact('')
    setLeadEmail('')
  }, [open, result])

  if (!result) return null

  const leadContext: LeadContext = {
    source: 'ai_roaster',
    roastSource: result.source,
    objectionTitles: result.objections.map((o) => o.title),
    niche,
    buyerRole,
  }

  const handleInlineLead = async () => {
    const name = leadName.trim()
    const contact = leadContact.trim()
    const email = leadEmail.trim()
    if (!name || !contact) {
      setLeadError('Введите имя и контакт')
      return
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setLeadError('Проверьте адрес электронной почты')
      return
    }
    setLeadSubmitting(true)
    setLeadError(null)
    try {
      await captureLead({
        name,
        contact,
        email: email || undefined,
        source: 'ai_roaster',
        roast_source: result.source,
        objection_titles: result.objections.map((o) => o.title),
        niche,
        buyer_role: buyerRole,
      })
      setLeadDone(true)
      // TODO: здесь нужно запустить фоновый расширенный AI-анализ (endpoint + задержка отправки email — уточнить у команды)
    } catch {
      setLeadError('Не удалось отправить. Откройте форму разбора или напишите в Telegram.')
    } finally {
      setLeadSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
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
            aria-labelledby="roast-result-title"
            className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden border border-zinc-800 bg-[#1D1D1D] sm:max-h-[90vh]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  roast_result · {result.mode || 'standard'}
                  {result.engine ? ` · ${result.engine}` : ''}
                </p>
                <h2
                  id="roast-result-title"
                  className="truncate text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl"
                >
                  AI-аудит: {result.objections.length} возражения
                </h2>
                <p className="mt-1 truncate font-mono text-[11px] text-zinc-600">
                  {result.source}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-50"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[1.4fr_0.85fr]">
              {/* Left: objections */}
              <div className="min-h-0 space-y-3 overflow-y-auto border-b border-zinc-800 px-5 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:border-b-0 lg:border-r lg:border-zinc-800">
                {result.objections.map((obj, i) => (
                  <motion.div
                    key={obj.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-zinc-500">{obj.id}</span>
                      <span className="border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        {obj.severity}
                      </span>
                      <h3 className="text-sm font-medium text-zinc-50">{obj.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-400">{obj.detail}</p>
                  </motion.div>
                ))}

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex flex-col items-start justify-center gap-0.5 border border-zinc-700 bg-transparent px-4 py-3 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1D1D]"
                  >
                    {downloadSaved ? (
                      <span className="flex items-center gap-2"><Check size={16} className="shrink-0" />✓ Сохранено</span>
                    ) : (
                      <>
                        <span className="flex items-center gap-2"><Download size={16} className="shrink-0" />Скачать AI-Аудит (.MD)</span>
                        <span className="mt-0.5 font-mono text-[10px] font-normal text-zinc-500">открывается в браузере или любом текстовом редакторе</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center justify-center gap-2 border border-zinc-700 bg-transparent px-4 py-3 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1D1D]"
                  >
                    {copySaved ? (
                      <>
                        <Check size={16} className="shrink-0" />
                        ✓ Скопировано
                      </>
                    ) : (
                      <>
                        <Copy size={16} className="shrink-0" />
                        Скопировать отчёт
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: lead panel */}
              <aside className="flex min-h-0 flex-col bg-zinc-950/80 px-5 py-5 sm:px-6 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-zinc-600">
                  next_step // устранить возражения
                </p>
                <h3 className="mb-3 text-base font-semibold tracking-tight text-zinc-50">
                  Разбор по вашему аудиту
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                  Оставьте контакт — бесплатно разберём эти возражения на 15-минутном созвоне с фаундерами.
                  {' '}Плюс пришлём на почту расширенный AI-разбор вашего сайта.
                </p>

                {leadDone ? (
                  <p className="font-mono text-sm text-zinc-50">
                    ✓ Заявка принята! Мы свяжемся с вами в Telegram/WhatsApp.
                    {leadEmail ? ' Расширенный AI-разбор придёт на почту в течение часа.' : ''}
                  </p>
                ) : (
                  <div className="flex flex-1 flex-col gap-3">
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      disabled={leadSubmitting}
                      placeholder="Имя"
                      className="w-full border border-zinc-700 bg-[#1D1D1D] px-3 py-3 font-mono text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                    />
                    <input
                      type="text"
                      value={leadContact}
                      onChange={(e) => setLeadContact(e.target.value)}
                      disabled={leadSubmitting}
                      placeholder="Telegram / WhatsApp"
                      className="w-full border border-zinc-700 bg-[#1D1D1D] px-3 py-3 font-mono text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                    />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      disabled={leadSubmitting}
                      placeholder="Email — пришлём расширенный AI-разбор (необязательно)"
                      className="w-full border border-zinc-700 bg-[#1D1D1D] px-3 py-3 font-mono text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                    />
                    {leadError && (
                      <p className="font-mono text-xs text-zinc-400" role="alert">
                        {leadError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleInlineLead()}
                      disabled={leadSubmitting}
                      className="mt-1 inline-flex w-full items-center justify-center gap-2 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-60"
                    >
                      {leadSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        'Получить разбор по аудиту'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onBookCall(leadContext)}
                      disabled={leadSubmitting}
                      className="inline-flex w-full items-center justify-center border border-zinc-600 bg-transparent px-5 py-3 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-60"
                    >
                      Открыть форму
                    </button>
                  </div>
                )}
              </aside>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
