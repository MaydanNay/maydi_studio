import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, Plus, Paperclip } from 'lucide-react'
import type { LeadContext } from '../lib/leads'
import { loadRoastSession, saveRoastSession } from '../lib/roastStorage'
import { RoastResultModal } from './RoastResultModal'
import { LineReveal, WordReveal } from './MotionText'

type RoastObjection = {
  id: string
  title: string
  severity: 'HIGH' | 'MED' | 'LOW'
  detail: string
}

type RoastResponse = {
  objections: RoastObjection[]
  source: string
  mode?: 'standard' | 'wow'
  engine?: string
}

type BuyerRole =
  | 'CEO'
  | 'CFO'
  | 'CTO'
  | 'CMO'
  | 'Head of Sales'
  | 'Head of Marketing'
  | 'Founder'
  | 'Other'

type IcpContext = {
  niche?: string
  buyer_role?: BuyerRole
  avg_check?: string
}

type AiRoasterProps = {
  onBookCall: (ctx?: LeadContext) => void
}

const BUYER_ROLES: Array<BuyerRole | ''> = [
  '',
  'CEO',
  'CFO',
  'CTO',
  'CMO',
  'Head of Sales',
  'Head of Marketing',
  'Founder',
  'Other',
]

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ROAST_URL = API_BASE
  ? `${API_BASE}/api/v1/tools/roast`
  : '/api/v1/tools/roast'
const CLIENT_TIMEOUT_MS = 90_000

const CONNECTION_ERROR =
  'error // connection_refused: убедитесь, что локальный бэкенд запущен на порту 8000'

const SCAN_URL = [
  '> mimora_roast_engine // initializing...',
  '> url_normalize // validating target & SSRF guards...',
  '> jina_reader // fetching DOM structure for target...',
  '> facts_pass // extracting offer / price / proof / CTA...',
  '> icp_matrix // locking buyer persona...',
  '> roast_pass // scoring conversion blockers...',
  '> quality_gate // quotes + axis diversity check...',
] as const

const SCAN_COPY = [
  '> mimora_roast_engine // initializing...',
  '> offer_parser // ingesting direct offer copy...',
  '> facts_pass // extracting offer / price / proof / CTA...',
  '> icp_matrix // locking buyer persona...',
  '> roast_pass // scoring conversion blockers...',
  '> quality_gate // quotes + axis diversity check...',
] as const

const URL_LIKE_RE =
  /^(https?:\/\/|(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/:?#].*)?)$/i

class RoastRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoastRequestError'
  }
}

function looksLikeUrl(value: string): boolean {
  return URL_LIKE_RE.test(value.trim())
}

function normalizeObjection(raw: unknown, index: number): RoastObjection | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = String(item.title ?? '').trim()
  const detail = String(item.detail ?? '').trim()
  if (!title || !detail) return null

  const severityRaw = String(item.severity ?? 'MED').trim().toUpperCase()
  const severity: RoastObjection['severity'] =
    severityRaw === 'HIGH' ? 'HIGH' : severityRaw === 'LOW' ? 'LOW' : 'MED'

  const idNum = Number(item.id)
  const id =
    Number.isFinite(idNum) && idNum > 0
      ? String(idNum).padStart(2, '0')
      : String(item.id ?? '').trim() || String(index + 1).padStart(2, '0')

  return { id, title, severity, detail }
}

async function roastOffer(
  input: string,
  signal: AbortSignal,
  icp?: IcpContext,
  mode: 'standard' | 'wow' = 'standard',
): Promise<RoastResponse> {
  const body: {
    input: string
    icp?: IcpContext
    mode: 'standard' | 'wow'
  } = { input, mode }
  if (icp && (icp.niche || icp.buyer_role || icp.avg_check)) {
    body.icp = icp
  }

  let res: Response
  try {
    res = await fetch(ROAST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new RoastRequestError('error // aborted: запрос отменён')
    }
    throw new RoastRequestError(CONNECTION_ERROR)
  }

  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new RoastRequestError(CONNECTION_ERROR)
    }
    let detail = `error // http_${res.status}: roast request failed`
    try {
      const payload = (await res.json()) as { detail?: unknown }
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        detail = `error // ${payload.detail}`
      }
    } catch {
      // keep default
    }
    throw new RoastRequestError(detail)
  }

  const data = (await res.json()) as Partial<RoastResponse>
  const objections = (data.objections ?? [])
    .map((obj, i) => normalizeObjection(obj, i))
    .filter((obj): obj is RoastObjection => obj !== null)

  if (!objections.length) {
    throw new RoastRequestError('error // empty_response: backend returned no objections')
  }

  return {
    source: String(data.source ?? input),
    objections,
    mode: data.mode === 'wow' ? 'wow' : 'standard',
    engine: data.engine ? String(data.engine) : undefined,
  }
}

function slugFromSource(source: string): string {
  try {
    if (/^https?:\/\//i.test(source)) {
      const host = new URL(source).hostname.replace(/^www\./, '')
      return host.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase() || 'offer'
    }
  } catch {
    // fall through
  }
  return (
    source
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'offer'
  )
}

function buildMarkdownReport(
  result: RoastResponse,
  originalInput: string,
  icp?: IcpContext,
): string {
  const date = new Date().toISOString().slice(0, 10)
  const lines = [
    `# AI-Аудит лендинга: ${result.source}`,
    '',
    `**Дата:** ${date}`,
    '**Engine:** Generated by Mimora 100-ICP Engine (maydi.studio)',
    '',
  ]

  if (icp && (icp.niche || icp.buyer_role || icp.avg_check)) {
    lines.push('## ICP Context')
    lines.push('')
    if (icp.niche) lines.push(`- **Niche:** ${icp.niche}`)
    if (icp.buyer_role) lines.push(`- **Buyer:** ${icp.buyer_role}`)
    if (icp.avg_check) lines.push(`- **Avg check:** ${icp.avg_check}`)
    lines.push('')
  }

  if (result.source === 'Direct Offer Copy' && originalInput.trim()) {
    lines.push('## Исходный оффер')
    lines.push('')
    lines.push('```')
    lines.push(originalInput.trim().slice(0, 2000))
    lines.push('```')
    lines.push('')
  }

  lines.push('## Критические возражения ЛПР', '')

  for (const obj of result.objections) {
    lines.push(`### ${obj.id}. [${obj.severity}] ${obj.title}`)
    lines.push('')
    lines.push(obj.detail)
    lines.push('')
  }

  lines.push('---', '')
  lines.push('Устраните 95% возражений ДО запуска трафика: https://maydi.studio')
  lines.push('')

  return lines.join('\n')
}

function downloadMarkdown(
  result: RoastResponse,
  originalInput: string,
  icp?: IcpContext,
) {
  const markdown = buildMarkdownReport(result, originalInput, icp)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mimora-audit-${slugFromSource(result.source)}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Кастомный дропдаун для выбора роли ЛПР в стиле сайта */
function BuyerRoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: BuyerRole | ''
  onChange: (v: BuyerRole | '') => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Закрываем по клику вне компонента
  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const label = value || 'ЛПР (buyer)'

  return (
    <div ref={containerRef} className="relative">
      {/* Триггер */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] focus:border-[#111111] focus:outline-none disabled:opacity-50"
      >
        <span className={value ? 'text-[#111111]' : 'text-[#111111]/35'}>{label}</span>
        <span
          className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[9px] text-[#6b6b6b] transition-transform duration-200"
          style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* Список — открывается ВВЕРХ */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ originY: 0 }}
            className="absolute top-[calc(100%+4px)] left-0 z-50 w-full max-h-[200px] overflow-y-auto border border-[#111111] bg-[#f2f2f2] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            {/* Сброс */}
            <li
              role="option"
              aria-selected={value === ''}
              onClick={() => { onChange(''); setOpen(false) }}
              className="cursor-pointer px-3.5 py-2 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.1em] text-[#6b6b6b] transition-colors hover:bg-[#111111] hover:text-[#f2f2f2]"
            >
              ЛПР (buyer)
            </li>
            {BUYER_ROLES.filter(Boolean).map((role) => (
              <li
                key={role}
                role="option"
                aria-selected={value === role}
                onClick={() => { onChange(role as BuyerRole); setOpen(false) }}
                className={[
                  'cursor-pointer px-3.5 py-2 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.1em] transition-colors hover:bg-[#111111] hover:text-[#f2f2f2]',
                  value === role ? 'bg-[#111111] text-[#f2f2f2]' : 'text-[#111111]',
                ].join(' ')}
              >
                {role}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AiRoaster({ onBookCall }: AiRoasterProps) {
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [showIcp, setShowIcp] = useState(false)
  const [niche, setNiche] = useState('')
  const [buyerRole, setBuyerRole] = useState<BuyerRole | ''>('')
  const [avgCheck, setAvgCheck] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoastResponse | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [scanMode, setScanMode] = useState<'url' | 'copy'>('url')
  const [visibleScanLines, setVisibleScanLines] = useState(0)
  const [downloadSaved, setDownloadSaved] = useState(false)
  const [copySaved, setCopySaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastInputRef = useRef('')
  const lastIcpRef = useRef<IcpContext | undefined>(undefined)

  const scanLines = scanMode === 'url' ? SCAN_URL : SCAN_COPY

  const buildIcp = (): IcpContext | undefined => {
    const icp: IcpContext = {}
    if (niche.trim()) icp.niche = niche.trim()
    if (buyerRole) icp.buyer_role = buyerRole
    if (avgCheck.trim()) icp.avg_check = avgCheck.trim()
    return icp.niche || icp.buyer_role || icp.avg_check ? icp : undefined
  }

  useEffect(() => {
    if (!loading) {
      setVisibleScanLines(0)
      return
    }

    setVisibleScanLines(1)
    let i = 1
    const timer = window.setInterval(() => {
      i += 1
      setVisibleScanLines((prev) => Math.min(prev + 1, scanLines.length))
      if (i >= scanLines.length) window.clearInterval(timer)
    }, 900)

    return () => window.clearInterval(timer)
  }, [loading, scanLines.length])

  useEffect(() => {
    if (!downloadSaved) return
    const t = window.setTimeout(() => setDownloadSaved(false), 2000)
    return () => window.clearTimeout(t)
  }, [downloadSaved])

  useEffect(() => {
    if (!copySaved) return
    const t = window.setTimeout(() => setCopySaved(false), 2000)
    return () => window.clearTimeout(t)
  }, [copySaved])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const saved = loadRoastSession()
    if (!saved) return
    setResult(saved.result)
    lastInputRef.current = saved.originalInput
    lastIcpRef.current = saved.icp as IcpContext | undefined
    if (saved.originalInput) setInput(saved.originalInput)
    if (saved.icp?.niche) {
      setNiche(saved.icp.niche)
      setShowIcp(true)
    }
    if (saved.icp?.buyer_role) {
      setBuyerRole(saved.icp.buyer_role as BuyerRole)
      setShowIcp(true)
    }
    if (saved.icp?.avg_check) {
      setAvgCheck(saved.icp.avg_check)
      setShowIcp(true)
    }
  }, [])

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  const handleRoast = async () => {
    const trimmed = input.trim()
    if (!trimmed) {
      setError('error // empty_input: введите URL сайта или текст оффера')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

    lastInputRef.current = trimmed
    const icp = buildIcp()
    lastIcpRef.current = icp

    // Если прикреплен файл — пока показываем ошибку, так как нет бэкенда для файлов
    if (attachedFile) {
      setError('error // creative_mode: анализ файлов/изображений в разработке. Отправьте ссылку или текст.')
      return
    }

    setScanMode(looksLikeUrl(trimmed) ? 'url' : 'copy')
    setError(null)
    setLoading(true)
    setResult(null)
    setResultOpen(false)
    setDownloadSaved(false)
    setCopySaved(false)

    try {
      const data = await roastOffer(
        trimmed,
        controller.signal,
        icp,
        'standard',
      )
      setResult(data)
      setResultOpen(true)
      saveRoastSession({
        result: data,
        originalInput: trimmed,
        icp,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        setError(
          err instanceof RoastRequestError && err.message.includes('aborted')
            ? err.message
            : 'error // timeout_or_aborted: запрос отменён или превысил лимит времени',
        )
      } else {
        const message =
          err instanceof RoastRequestError
            ? err.message
            : 'error // roast_failed: не удалось запустить прожарку'
        setError(message)
      }
    } finally {
      window.clearTimeout(timeoutId)
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadMarkdown(result, lastInputRef.current, lastIcpRef.current)
    setDownloadSaved(true)
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(
        buildMarkdownReport(result, lastInputRef.current, lastIcpRef.current),
      )
      setCopySaved(true)
    } catch {
      setError('error // clipboard: не удалось скопировать отчёт')
    }
  }

  return (
    <section id="ai-roaster" className="section-shell relative overflow-x-clip">
      <div className="page-columns" aria-hidden />

      <div className="relative z-10 w-full py-16 md:py-24">
        <header className="mb-10 flex flex-col gap-4 px-5 md:mb-14 md:flex-row md:items-end md:justify-between md:px-8">
          <h2 className="max-w-[18ch] font-sans text-[clamp(1.85rem,4.6vw,3.4rem)] font-medium uppercase leading-[1.02] tracking-[0.04em] text-[#111111]">
            <WordReveal text="Сомневаетесь в конверсии?" delay={0.05} stagger={0.045} />
          </h2>
          <p className="shrink-0 font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-[#6b6b6b] md:pb-1 md:text-right">
            <LineReveal delay={0.25}>прожарьте гипотезу за 15 секунд.</LineReveal>
          </p>
        </header>

        {/* 4 cols = page-columns 25/50/75 - form spans first two */}
        <div className="page-grid items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col px-5 py-2 md:col-span-2 md:px-8"
          >

            {/* Поле ввода */}
            <div className="mb-4">
              <label
                htmlFor="roast-input"
                className="mb-3 block font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.16em] text-[#6b6b6b]"
              >
                Вставьте ссылку на сайт, впишите оффер, креатив или прикрепите файл
              </label>

              <div className="relative flex items-end gap-2 border-b border-[#111111] bg-transparent pb-3">
                <div className="relative shrink-0">
                  <input
                    type="file"
                    id="roast-file-upload"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setAttachedFile(file)
                    }}
                  />
                  <label
                    htmlFor="roast-file-upload"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#111111]/5 text-[#111111] transition-colors hover:bg-[#111111]/10"
                    title="Прикрепить файл или креатив"
                  >
                    <Plus size={18} strokeWidth={1.5} />
                  </label>
                </div>

                <div className="flex w-full flex-col">
                  {attachedFile && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-[#111111]/5 px-2.5 py-1 font-mono text-[11px] text-[#111111]">
                        <Paperclip size={12} />
                        <span className="max-w-[150px] truncate">{attachedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          className="ml-1 hover:text-[#C4846A]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    </div>
                  )}
                  <textarea
                    id="roast-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !loading) {
                        e.preventDefault()
                        void handleRoast()
                      }
                    }}
                    placeholder="https://maydi.net/ или ваш оффер..."
                    disabled={loading}
                    rows={input.includes('\n') || input.length > 50 ? 3 : 1}
                    className="w-full resize-none bg-transparent font-sans text-[14px] leading-relaxed text-[#111111] placeholder:text-[#111111]/35 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={() => setShowIcp((v) => !v)}
                  disabled={loading}
                  className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b] transition-colors hover:text-[#111111] disabled:opacity-50"
                >
                  {showIcp ? '▾' : '▸'} Уточнить целевую аудиторию
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showIcp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative z-10"
                  >
                    <div className="grid gap-3 pt-1 pb-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        disabled={loading}
                        placeholder="ниша: EdTech (бизнес со сложным циклом продажи и чеком от 1 млн ₸)"
                        className="border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111] focus:outline-none disabled:opacity-50"
                      />
                      <BuyerRoleSelect
                        value={buyerRole}
                        onChange={setBuyerRole}
                        disabled={loading}
                      />
                      <input
                        type="text"
                        value={avgCheck}
                        onChange={(e) => setAvgCheck(e.target.value)}
                        disabled={loading}
                        placeholder="чек: $10 000"
                        className="border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111] focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="relative z-0 inline-flex w-full items-center justify-center gap-2 border border-[#111111] bg-transparent px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#111111] transition-opacity hover:opacity-55 focus:outline-none"
                >
                  <X size={15} className="shrink-0" strokeWidth={1.5} />
                  Отмена
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRoast()}
                  className="relative z-0 inline-flex w-full items-center justify-center bg-[#111111] px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#f2f2f2] transition-opacity hover:opacity-80 focus:outline-none"
                >
                  Запустить AI-прожарку
                </button>
              )}
            </div>

            {error && (
              <p
                className="mt-5 font-[family-name:var(--font-jetbrains)] text-[11px] leading-relaxed text-[#8a3a3a]"
                role="alert"
              >
                {error}
              </p>
            )}

            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0 }}
                  className="mt-6 overflow-hidden font-[family-name:var(--font-jetbrains)] text-[11px] text-[#6b6b6b]"
                >
                  <p className="mb-2 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    running…
                  </p>
                  {scanLines.slice(0, visibleScanLines).map((line, i) => {
                    const isLast = i === visibleScanLines - 1
                    return (
                      <motion.p
                        key={line}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: isLast ? 1 : 0.45, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={isLast ? 'cursor-blink mt-1 first:mt-0' : 'mt-1 first:mt-0'}
                      >
                        {line}
                      </motion.p>
                    )
                  })}
                </motion.div>
              )}

              {result && !loading && !resultOpen && (
                <motion.div
                  key="result-ready"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex flex-col gap-3"
                >
                  <p className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.1em] text-[#6b6b6b]">
                    ready · {result.objections.length} · {result.mode || 'standard'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setResultOpen(true)}
                    className="inline-flex items-center justify-center border border-[#111111] bg-transparent px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-[#111111] transition-opacity hover:opacity-55 focus:outline-none"
                  >
                    Открыть отчёт
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-12 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">
              без регистрации · результат сразу
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 py-2 font-sans text-[13px] font-medium leading-[1.85] tracking-[0.02em] text-[#111111] md:px-6 md:text-[14px]"
          >
            Ссылка или текст оффера - за 15 секунд три главные причины, почему клиенты уходят без
            покупки.
            <br />
            <br />
            Mimora читает лендинг как ЛПР: оффер, доказательство, цена, CTA.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 py-2 font-sans text-[13px] font-medium leading-[1.85] tracking-[0.02em] text-[#111111] md:px-6 md:pr-8 md:text-[14px]"
          >
            Без регистрации. Результат — сразу в интерфейсе. Отчёт можно скачать и переслать команде.
          </motion.p>
        </div>
      </div>

      <RoastResultModal
        open={resultOpen && !!result}
        onClose={() => setResultOpen(false)}
        result={result}
        niche={lastIcpRef.current?.niche}
        buyerRole={lastIcpRef.current?.buyer_role}
        onDownload={handleDownload}
        onCopy={() => void handleCopy()}
        downloadSaved={downloadSaved}
        copySaved={copySaved}
        onBookCall={onBookCall}
      />
    </section>
  )
}
