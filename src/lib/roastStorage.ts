export type RoastObjection = {
  id: string
  title: string
  severity: 'HIGH' | 'MED' | 'LOW'
  detail: string
}

export type RoastResult = {
  objections: RoastObjection[]
  source: string
  mode?: 'standard' | 'wow'
  engine?: string
}

export type StoredIcp = {
  niche?: string
  buyer_role?: string
  avg_check?: string
}

export type StoredRoastSession = {
  version: 1
  savedAt: number
  result: RoastResult
  originalInput: string
  icp?: StoredIcp
}

const STORAGE_KEY = 'maydi.roast.last_result.v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isValidResult(value: unknown): value is RoastResult {
  if (!value || typeof value !== 'object') return false
  const r = value as RoastResult
  return (
    typeof r.source === 'string' &&
    Array.isArray(r.objections) &&
    r.objections.length > 0 &&
    r.objections.every(
      (o) =>
        o &&
        typeof o.id === 'string' &&
        typeof o.title === 'string' &&
        typeof o.detail === 'string' &&
        (o.severity === 'HIGH' || o.severity === 'MED' || o.severity === 'LOW'),
    )
  )
}

export function saveRoastSession(session: Omit<StoredRoastSession, 'version' | 'savedAt'>) {
  try {
    const payload: StoredRoastSession = {
      version: 1,
      savedAt: Date.now(),
      result: session.result,
      originalInput: session.originalInput,
      icp: session.icp,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode - ignore
  }
}

export function loadRoastSession(): StoredRoastSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredRoastSession>
    if (parsed.version !== 1 || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!isValidResult(parsed.result) || typeof parsed.originalInput !== 'string') {
      return null
    }
    return {
      version: 1,
      savedAt: parsed.savedAt,
      result: parsed.result,
      originalInput: parsed.originalInput,
      icp: parsed.icp,
    }
  } catch {
    return null
  }
}

export function clearRoastSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
