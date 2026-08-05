export type LeadSource = 'ai_roaster' | 'booking' | 'footer' | 'other'

export type LeadContext = {
  source?: LeadSource
  roastSource?: string
  objectionTitles?: string[]
  niche?: string
  buyerRole?: string
}

export type LeadPayload = {
  name: string
  contact: string
  source: LeadSource
  roast_source?: string
  objection_titles?: string[]
  niche?: string
  buyer_role?: string
}

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const LEADS_URL = API_BASE ? `${API_BASE}/api/v1/leads` : '/api/v1/leads'

const TELEGRAM_BOOKING_URL = 'https://t.me/MaydanMR'

export function buildTelegramLeadMessage(payload: LeadPayload): string {
  const lines = [
    'Здравствуйте! Хочу стратегический разбор.',
    `Имя: ${payload.name}`,
    `Контакт: ${payload.contact}`,
  ]
  if (payload.source === 'ai_roaster') {
    lines.push('Источник: AI-прожарка')
  }
  if (payload.roast_source) {
    lines.push(`Оффер: ${payload.roast_source}`)
  }
  if (payload.niche) lines.push(`Ниша: ${payload.niche}`)
  if (payload.buyer_role) lines.push(`ЛПР: ${payload.buyer_role}`)
  if (payload.objection_titles?.length) {
    lines.push('Возражения:')
    payload.objection_titles.forEach((t, i) => {
      lines.push(`${i + 1}. ${t}`)
    })
  }
  return lines.join('\n')
}

export function openTelegramLead(payload: LeadPayload) {
  const text = encodeURIComponent(buildTelegramLeadMessage(payload))
  window.open(`${TELEGRAM_BOOKING_URL}?text=${text}`, '_blank', 'noopener,noreferrer')
}

export async function submitLead(payload: LeadPayload): Promise<{ id: string }> {
  const res = await fetch(LEADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let detail = `http_${res.status}`
    try {
      const data = (await res.json()) as { detail?: unknown }
      if (typeof data.detail === 'string') detail = data.detail
    } catch {
      // ignore
    }
    throw new Error(detail)
  }
  const data = (await res.json()) as { id: string }
  return { id: data.id }
}

/** Persist lead (best-effort) then open Telegram with roast context. */
export async function captureLead(payload: LeadPayload): Promise<void> {
  try {
    await submitLead(payload)
  } catch (err) {
    console.warn('lead persist failed, still opening telegram', err)
  }
  openTelegramLead(payload)
}
