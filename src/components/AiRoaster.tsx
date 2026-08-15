import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
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
const CLIENT_TIMEOUT_WOW_MS = 140_000

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

const SCAN_WOW_EXTRA = '> wow_engine // gpt-4o deep critique pass...' as const

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

export function AiRoaster({ onBookCall }: AiRoasterProps) {
  const [input, setInput] = useState('')
  const [showIcp, setShowIcp] = useState(false)
  const [wowMode, setWowMode] = useState(false)
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

  const scanLines = [
    ...(scanMode === 'url' ? SCAN_URL : SCAN_COPY),
    ...(wowMode ? [SCAN_WOW_EXTRA] : []),
  ]

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
    lastIcpRef.current = saved.icp
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
    if (saved.result.mode === 'wow') setWowMode(true)
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
    const timeoutMs = wowMode ? CLIENT_TIMEOUT_WOW_MS : CLIENT_TIMEOUT_MS
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    lastInputRef.current = trimmed
    const icp = buildIcp()
    lastIcpRef.current = icp
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
        wowMode ? 'wow' : 'standard',
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
            <LineReveal delay={0.25}>прожарьте сайт.</LineReveal>
          </p>
        </header>

        {/* 4 cols = page-columns 25/50/75 — form spans first two */}
        <div className="page-grid items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col px-5 py-2 md:col-span-2 md:px-8"
          >
            <p className="mb-8 font-sans text-[13px] font-medium leading-[1.6] text-[#111111]">
              <span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-1px] bg-[#111111]" aria-hidden />
              Запустить AI-прожарку
            </p>

            <label
              htmlFor="roast-input"
              className="mb-3 block font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.16em] text-[#6b6b6b]"
            >
              url || offer_copy
            </label>

            <input
              id="roast-input"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) void handleRoast()
              }}
              placeholder="https://maydi.net/ или текст оффера"
              disabled={loading}
              className="w-full border-b border-[#111111] bg-transparent pb-3 font-sans text-[14px] text-[#111111] placeholder:text-[#111111]/35 focus:outline-none disabled:opacity-50"
            />

            <div className="mt-6 flex flex-col gap-4">
              {loading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex w-full items-center justify-center gap-2 border border-[#111111] bg-transparent px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#111111] transition-opacity hover:opacity-55 focus:outline-none"
                >
                  <X size={15} className="shrink-0" strokeWidth={1.5} />
                  Отмена
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRoast()}
                  className="inline-flex w-full items-center justify-center bg-[#111111] px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#f2f2f2] transition-opacity hover:opacity-80 focus:outline-none"
                >
                  Запустить
                </button>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={() => setShowIcp((v) => !v)}
                  disabled={loading}
                  className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b] transition-colors hover:text-[#111111] disabled:opacity-50"
                >
                  {showIcp ? '▾' : '▸'} icp_context
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.12em] text-[#6b6b6b]">
                  <input
                    type="checkbox"
                    checked={wowMode}
                    disabled={loading}
                    onChange={(e) => setWowMode(e.target.checked)}
                    className="h-3 w-3 appearance-none border border-[#111111]/45 bg-transparent checked:bg-[#111111]"
                  />
                  <span className={wowMode ? 'text-[#111111]' : undefined}>wow_mode</span>
                </label>
              </div>

              <AnimatePresence initial={false}>
                {showIcp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 pt-1 sm:grid-cols-3">
                      <input
                        type="text"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        disabled={loading}
                        placeholder="ниша: B2B EdTech"
                        className="border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111] focus:outline-none disabled:opacity-50"
                      />
                      <select
                        value={buyerRole}
                        onChange={(e) => setBuyerRole(e.target.value as BuyerRole | '')}
                        disabled={loading}
                        className="border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] focus:border-[#111111] focus:outline-none disabled:opacity-50"
                      >
                        <option value="">ЛПР (buyer)</option>
                        {BUYER_ROLES.filter(Boolean).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={avgCheck}
                        onChange={(e) => setAvgCheck(e.target.value)}
                        disabled={loading}
                        placeholder="чек: 80 000₽/мес"
                        className="border-b border-[#111111]/35 bg-transparent pb-2 font-sans text-[13px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111] focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              без регистрации · отчёт в модалке + .md
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 py-2 font-sans text-[13px] font-medium leading-[1.85] tracking-[0.02em] text-[#111111] md:px-6 md:text-[14px]"
          >
            Ссылка или текст оффера — за 15 секунд три главные причины, почему клиенты уходят без
            покупки. Mimora читает лендинг как ЛПР: оффер, доказательство, цена, CTA.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 py-2 font-sans text-[13px] font-medium leading-[1.85] tracking-[0.02em] text-[#111111] md:px-6 md:pr-8 md:text-[14px]"
          >
            Без регистрации. Результат сразу в модалке — и можно скачать .md-отчёт для команды до
            запуска трафика.
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
