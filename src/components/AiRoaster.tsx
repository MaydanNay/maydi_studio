import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Loader2, Terminal, X } from 'lucide-react'
import type { LeadContext } from '../lib/leads'
import { loadRoastSession, saveRoastSession } from '../lib/roastStorage'
import { RoastResultModal } from './RoastResultModal'

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
    <section id="ai-roaster" className="border-t border-zinc-800 bg-[#09090B]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Lead Magnet / AI Tool
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Сомневаетесь в конверсии своего сайта? Прожарьте его прямо сейчас.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Введите ссылку на ваш лендинг или текст оффера — наша нейросеть за 15 секунд найдёт 3
            главные причины, почему клиенты уходят без покупки.
          </p>
        </div>

        <div className="overflow-hidden border border-zinc-800 bg-[#09090B]">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Terminal size={14} className="shrink-0 text-zinc-500" />
              <span className="truncate font-mono text-[10px] text-zinc-500 sm:text-[11px]">
                maydi@mimora — roast_engine v1.3
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
          </div>

          <div className="p-3 sm:p-6">
            <label
              htmlFor="roast-input"
              className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-zinc-600"
            >
              input_url || offer_copy
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
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
                placeholder="https://maydi.net/ или maydi.net"
                disabled={loading}
                className="min-w-0 w-full flex-1 border border-zinc-800 bg-zinc-950 px-3 py-3 font-mono text-sm text-zinc-50 placeholder:text-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none disabled:opacity-60 sm:px-4"
              />
              {loading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 border border-zinc-700 bg-transparent px-4 py-3 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] sm:w-auto sm:px-5"
                >
                  <X size={16} className="shrink-0" />
                  Отмена
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRoast()}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] sm:w-auto sm:px-5"
                >
                  <Zap size={16} className="shrink-0" />
                  <span className="text-center leading-snug">Запустить AI-прожарку</span>
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowIcp((v) => !v)}
                disabled={loading}
                className="font-mono text-[11px] uppercase tracking-wider text-zinc-600 transition-colors hover:text-zinc-400 disabled:opacity-60"
              >
                {showIcp ? '▾' : '▸'} icp_context // опционально
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-600">
                <input
                  type="checkbox"
                  checked={wowMode}
                  disabled={loading}
                  onChange={(e) => setWowMode(e.target.checked)}
                  className="h-3.5 w-3.5 accent-zinc-50"
                />
                <span className={wowMode ? 'text-zinc-300' : undefined}>
                  wow_mode // gpt-4o · two-pass
                </span>
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
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      disabled={loading}
                      placeholder="ниша: B2B EdTech"
                      className="border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                    />
                    <select
                      value={buyerRole}
                      onChange={(e) => setBuyerRole(e.target.value as BuyerRole | '')}
                      disabled={loading}
                      className="border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-50 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
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
                      className="border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-3 text-center text-xs text-zinc-500">
              * Без регистрации. Отчёт откроется в модалке + .MD файл.
            </p>

            {error && (
              <p className="mt-3 font-mono text-xs text-zinc-400" role="alert">
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
                  className="mt-6 overflow-hidden border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-500"
                >
                  <p className="mb-2 flex items-center gap-2 text-zinc-600">
                    <Loader2 size={12} className="animate-spin" />
                    running…
                  </p>
                  {scanLines.slice(0, visibleScanLines).map((line, i) => {
                    const isLast = i === visibleScanLines - 1
                    return (
                      <motion.p
                        key={line}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: isLast ? 1 : 0.55, y: 0 }}
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
                  className="mt-6 flex flex-col gap-3 border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-mono text-xs text-zinc-500">
                    roast_complete · {result.objections.length} objections ·{' '}
                    {result.mode || 'standard'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setResultOpen(true)}
                    className="inline-flex items-center justify-center bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
                  >
                    Открыть отчёт
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
