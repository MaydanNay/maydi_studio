import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'

type Shape = 'circle' | 'pentagon' | 'diamond'

type PersonaTip = {
  kind: 'persona'
  header: string
  score: string
  intent: string
  segment: string
  quote: string
}

type ObjectionTip = {
  kind: 'objection'
  header: string
  severity: string
  impact: string
  verdict: string
  quote: string
}

type AgentTip = {
  kind: 'agent'
  header: string
  name: string
  age: number
  gender: 'М' | 'Ж'
  role: string
}

type TipData = PersonaTip | ObjectionTip | AgentTip

type SimNode = SimulationNodeDatum & {
  id: number
  r: number
  shape: Shape
  tip?: TipData
  homeX?: number
  homeY?: number
  opacity?: number
  scale?: number
  spawned?: boolean
  age?: number
}

type SimLink = SimulationLinkDatum<SimNode> & {
  source: number | SimNode
  target: number | SimNode
}

type TooltipState = {
  tip: TipData
  left: number
  top: number
}

/** Dark green — approved / high-intent ЛПР */
const COLOR_GOOD = '#166534'
const COLOR_GOOD_STROKE = '#4ade80'
/** Dark red — critical objections */
const COLOR_BAD = '#7f1d1d'
const COLOR_BAD_STROKE = '#f87171'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const FIRST_M = [
  'Алихан', 'Данияр', 'Ерлан', 'Нурлан', 'Тимур', 'Арман', 'Серик', 'Бауыржан',
  'Максим', 'Илья', 'Кирилл', 'Андрей', 'Руслан', 'Олжас', 'Денис', 'Саят',
]
const FIRST_F = [
  'Айгерим', 'Динара', 'Алия', 'Камила', 'Мадина', 'Асель', 'Жанар', 'Сауле',
  'Анна', 'Мария', 'Елена', 'Дарья', 'Амина', 'Зарина', 'Виктория', 'Инкар',
]
const LAST_M = [
  'Нурланов', 'Касымов', 'Ибраев', 'Смагулов', 'Оспанов', 'Беков', 'Жумабаев',
  'Петров', 'Иванов', 'Смирнов', 'Алиев', 'Мусин', 'Токтаров', 'Сериков',
]
const LAST_F = [
  'Нурланова', 'Касымова', 'Ибраева', 'Смагулова', 'Оспанова', 'Бекова',
  'Петрова', 'Иванова', 'Смирнова', 'Алиева', 'Мусина', 'Токтарова', 'Серикова',
]
const AGENT_ROLES = [
  'Product Manager', 'Growth Marketer', 'Sales Lead', 'Ops Manager',
  'Brand Strategist', 'Performance Buyer', 'BizDev', 'Analyst',
  'Account Executive', 'CRM Manager', 'Content Lead', 'Partnerships',
]

function makeAgentTip(nodeId: number, rand: () => number): AgentTip {
  const female = rand() > 0.48
  const first = female
    ? FIRST_F[Math.floor(rand() * FIRST_F.length)]
    : FIRST_M[Math.floor(rand() * FIRST_M.length)]
  const last = female
    ? LAST_F[Math.floor(rand() * LAST_F.length)]
    : LAST_M[Math.floor(rand() * LAST_M.length)]
  const age = 24 + Math.floor(rand() * 28)
  const role = AGENT_ROLES[Math.floor(rand() * AGENT_ROLES.length)]
  return {
    kind: 'agent',
    header: `NODE #${String(nodeId).padStart(2, '0')} // SYNTHETIC ICP`,
    name: `${first} ${last}`,
    age,
    gender: female ? 'Ж' : 'М',
    role,
  }
}

const PERSONA_TIPS: PersonaTip[] = [
  {
    kind: 'persona',
    header: 'NODE #12 // CFO — ENTERPRISE',
    score: '0.91',
    intent: 'HIGH',
    segment: 'B2B SaaS • Штат 50+',
    quote:
      'УТП понятно за 3 секунды. Одобрит бюджет, если есть гарантия соблюдения сроков в договоре.',
  },
  {
    kind: 'persona',
    header: 'NODE #27 // B2B FOUNDER — GROWTH',
    score: '0.94',
    intent: 'HIGH',
    segment: 'Agency / Studio • Штат 10–30',
    quote:
      'Ищет альтернативу долгим A/B-тестам. Готов забронировать стратегический разбор.',
  },
  {
    kind: 'persona',
    header: 'NODE #41 // CMO — LEAD MARKETER',
    score: '0.86',
    intent: 'MED-HIGH',
    segment: 'E-commerce / Leadgen • Бюджет 2M+',
    quote:
      'Возражение снято: предварительный тест креативов на 100 ЛПР снижает риск слива бюджета.',
  },
  {
    kind: 'persona',
    header: 'NODE #58 // CTO — TECH LEAD',
    score: '0.85',
    intent: 'HIGH',
    segment: 'Product SaaS • Штат 80+',
    quote:
      'Оценивает скорость и чистоту стека. React / Vite без конструкторов — сильный сигнал доверия.',
  },
  {
    kind: 'persona',
    header: 'NODE #73 // CEO — MID-MARKET',
    score: '0.88',
    intent: 'HIGH',
    segment: 'Services B2B • Выручка $1M+',
    quote:
      'Хочет предсказуемую конверсию до закупки трафика. Готов к фиксации DoD в договоре.',
  },
  {
    kind: 'persona',
    header: 'NODE #89 // HEAD OF SALES',
    score: '0.79',
    intent: 'MED',
    segment: 'Outbound / CRM • Команда 15+',
    quote:
      'Смотрит на воронку глазами менеджера. Нужен ясный следующий шаг и CRM-интеграция.',
  },
]

const OBJECTION_TIPS: ObjectionTip[] = [
  {
    kind: 'objection',
    header: 'NODE #27 // CRITICAL OBJECTION ◆',
    severity: 'HIGH',
    impact: 'CONVERSION LOSS',
    verdict: 'Непрозрачный расчет ROI и риск слива бюджета',
    quote:
      'CFO: "В оффере нет конкретных цифр по окупаемости. Слишком высокий риск блокировки бюджета на старте."',
  },
  {
    kind: 'objection',
    header: 'NODE #06 // CRITICAL OBJECTION ◆',
    severity: 'HIGH',
    impact: 'CONVERSION LOSS',
    verdict: 'Цена без якоря ценности',
    quote:
      'CFO: "Не вижу, почему это стоит заявленных денег. Нет сравнения с альтернативой."',
  },
  {
    kind: 'objection',
    header: 'NODE #94 // CRITICAL OBJECTION ◆',
    severity: 'MED',
    impact: 'TRUST DROP',
    verdict: 'Слабый proof-слой для B2B',
    quote:
      'Директор: "Нет кейсов с метриками. На этапе доверия ухожу без заявки."',
  },
  {
    kind: 'objection',
    header: 'NODE #51 // CRITICAL OBJECTION ◆',
    severity: 'MED',
    impact: 'FUNNEL LEAK',
    verdict: 'Неясный следующий шаг',
    quote:
      'ЛПР: "CTA размыт. Не понимаю, что будет после клика и сколько займёт разбор."',
  },
  {
    kind: 'objection',
    header: 'NODE #63 // CRITICAL OBJECTION ◆',
    severity: 'HIGH',
    impact: 'CONVERSION LOSS',
    verdict: 'Слишком общие формулировки оффера',
    quote:
      'Founder: "Звучит как любое агентство. Нет конкретики по срокам и DoD."',
  },
]

function pentagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`
}

function buildInitialGraph(count = 100): {
  nodes: SimNode[]
  links: SimLink[]
  spawnOrder: number[]
} {
  const rand = seededRandom(42)
  const nodes: SimNode[] = []
  const SEED = { x: 58, y: 48 }

  // Uniform fill including the center of the graph (not a hollow ring)
  for (let i = 0; i < count; i++) {
    const cols = 10
    const rows = 10
    const col = i % cols
    const row = Math.floor(i / cols)
    // Bias homes into the right-mid band of the SVG, but KEEP the local center filled
    const homeX = 28 + (col / (cols - 1)) * 58 + (rand() - 0.5) * 3.5
    const homeY = 30 + (row / (rows - 1)) * 40 + (rand() - 0.5) * 3.5
    nodes.push({
      id: i,
      x: SEED.x,
      y: SEED.y,
      homeX: Math.max(22, Math.min(90, homeX)),
      homeY: Math.max(28, Math.min(72, homeY)),
      r: 0.6 + rand() * 0.35,
      shape: 'circle',
      opacity: 0,
      scale: 0.2,
      spawned: false,
      age: 0,
      fx: SEED.x,
      fy: SEED.y,
      vx: 0,
      vy: 0,
    })
  }

  const order = [...nodes.keys()]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const diamondCount = Math.round(count * 0.05)
  const pentagonCount = Math.round(count * 0.2)

  order.forEach((idx, n) => {
    if (n < diamondCount) {
      nodes[idx].shape = 'diamond'
      nodes[idx].r = 1.35
    } else if (n < diamondCount + pentagonCount) {
      nodes[idx].shape = 'pentagon'
      nodes[idx].r = 1.15
    } else {
      nodes[idx].shape = 'circle'
      nodes[idx].r = 0.55 + (idx % 5) * 0.08
      nodes[idx].tip = makeAgentTip(idx, rand)
    }
  })

  // Non-tip pentagons also get agent cards (they're synthetic buyers too)
  order.slice(diamondCount + PERSONA_TIPS.length, diamondCount + pentagonCount).forEach((idx) => {
    if (!nodes[idx].tip) nodes[idx].tip = makeAgentTip(idx, rand)
  })

  // Tip homes scattered across the field (not one hollow ring that empties the center)
  const tipSlots = [
    { x: 48, y: 38 },
    { x: 68, y: 36 },
    { x: 78, y: 48 },
    { x: 70, y: 62 },
    { x: 52, y: 64 },
    { x: 40, y: 52 },
    { x: 58, y: 48 }, // center of graph zone
  ]
  const objectionSlots = [
    { x: 58, y: 34 },
    { x: 74, y: 42 },
    { x: 76, y: 58 },
    { x: 60, y: 68 },
    { x: 44, y: 44 },
  ]
  const pentIdx = order.slice(diamondCount, diamondCount + pentagonCount)
  PERSONA_TIPS.forEach((tip, i) => {
    const idx = pentIdx[i]
    if (idx == null) return
    const slot = tipSlots[i % tipSlots.length]
    nodes[idx].tip = tip
    nodes[idx].shape = 'pentagon'
    nodes[idx].r = 1.35
    nodes[idx].homeX = slot.x
    nodes[idx].homeY = slot.y
  })

  const diaIdx = order.slice(0, diamondCount)
  OBJECTION_TIPS.forEach((tip, i) => {
    const idx = diaIdx[i] ?? order[diamondCount + pentagonCount + i]
    if (idx == null) return
    const slot = objectionSlots[i % objectionSlots.length]
    nodes[idx].tip = tip
    nodes[idx].shape = 'diamond'
    nodes[idx].r = 1.4
    nodes[idx].homeX = slot.x
    nodes[idx].homeY = slot.y
  })

  // Sparse links — only very near neighbors, so the cloud can open up
  const links: SimLink[] = []
  const seen = new Set<string>()
  for (let i = 0; i < nodes.length; i++) {
    const nearest = nodes
      .map((n, j) => {
        if (j === i) return null
        const dx = (n.homeX ?? 0) - (nodes[i].homeX ?? 0)
        const dy = (n.homeY ?? 0) - (nodes[i].homeY ?? 0)
        return { j, d: dx * dx + dy * dy }
      })
      .filter((x): x is { j: number; d: number } => x !== null)
      .sort((a, b) => a.d - b.d)
      .slice(0, 1)

    for (const { j, d } of nearest) {
      if (d > 140) continue
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: i, target: j })
    }
  }

  // Spatial spawn order by distance from canvas center (spread, not one BFS blob)
  const spawnOrder = [...nodes.keys()].sort((a, b) => {
    const da =
      ((nodes[a].homeX ?? 50) - 50) ** 2 + ((nodes[a].homeY ?? 50) - 50) ** 2
    const db =
      ((nodes[b].homeX ?? 50) - 50) ** 2 + ((nodes[b].homeY ?? 50) - 50) ** 2
    return da - db
  })

  // Multiple seeds already at their homes — growth from many points, not one explosion
  const seedCount = 10
  for (let i = 0; i < seedCount; i++) {
    const id = spawnOrder[Math.floor((i / seedCount) * (count - 1))]
    const n = nodes[id]
    n.spawned = true
    n.age = 20
    n.opacity = 1
    n.scale = 1
    n.fx = null
    n.fy = null
    n.x = n.homeX
    n.y = n.homeY
    n.vx = 0
    n.vy = 0
  }

  return { nodes, links, spawnOrder }
}

function nodeFill(n: SimNode): string {
  if (n.shape === 'circle') return '#52525b'
  if (n.shape === 'pentagon') return n.tip?.kind === 'persona' ? COLOR_GOOD : '#3f6212'
  return COLOR_BAD
}

function NodeGeom({ node: n }: { node: SimNode }) {
  const x = n.x ?? 0
  const y = n.y ?? 0
  const s = n.scale ?? 1
  const r = n.r * s
  const op = (n.opacity ?? 1) * 0.95

  if (n.shape === 'pentagon') {
    return (
      <polygon
        points={pentagonPoints(x, y, r)}
        fill={nodeFill(n)}
        stroke={n.tip?.kind === 'persona' ? COLOR_GOOD_STROKE : '#4d7c0f'}
        strokeWidth={n.tip?.kind === 'persona' ? 0.35 : 0.2}
        opacity={op}
      />
    )
  }
  if (n.shape === 'diamond') {
    return (
      <polygon
        points={diamondPoints(x, y, r)}
        fill={COLOR_BAD}
        stroke={COLOR_BAD_STROKE}
        strokeWidth={0.45}
        opacity={op}
      />
    )
  }
  return <circle cx={x} cy={y} r={r} fill={nodeFill(n)} opacity={op * 0.75} />
}

function TooltipCard({ tip }: { tip: TipData }) {
  if (tip.kind === 'objection') {
    return (
      <>
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-red-200">
          {tip.header}
        </p>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-red-300/80">
          Severity: {tip.severity} <span className="text-zinc-600">|</span> Impact: {tip.impact}
        </p>
        <p className="mb-2 text-xs font-medium leading-snug text-zinc-100">«{tip.verdict}»</p>
        <p className="text-xs leading-relaxed text-zinc-400">{tip.quote}</p>
      </>
    )
  }

  if (tip.kind === 'agent') {
    return (
      <>
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          {tip.header}
        </p>
        <p className="mb-1 text-sm font-medium tracking-tight text-zinc-50">{tip.name}</p>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Возраст: {tip.age} <span className="text-zinc-600">|</span> Пол: {tip.gender}
        </p>
        <p className="font-mono text-[10px] text-zinc-500">Роль: {tip.role}</p>
      </>
    )
  }

  return (
    <>
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200">
        {tip.header}
      </p>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-emerald-300/80">
        Score: {tip.score} <span className="text-zinc-600">|</span> Intent: {tip.intent}
      </p>
      <p className="mb-2 font-mono text-[10px] text-zinc-500">Сегмент: {tip.segment}</p>
      <p className="text-xs leading-relaxed text-zinc-300">«{tip.quote}»</p>
    </>
  )
}

export function HeroNodeCanvas() {
  const initial = useMemo(() => buildInitialGraph(100), [])
  const [tick, setTick] = useState(0)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>(initial.nodes)
  const linksRef = useRef<SimLink[]>(initial.links)
  const spawnOrderRef = useRef<number[]>(initial.spawnOrder)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragMoved = useRef(false)

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  useEffect(() => {
    const nodes = nodesRef.current
    const links = linksRef.current
    const spawnOrder = spawnOrderRef.current
    let spawnCursor = 0
    let frame = 0
    const pending = spawnOrder.filter((id) => !nodes[id].spawned)

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(26)
          .strength((l) => {
            const s = l.source as SimNode
            const t = l.target as SimNode
            return s.spawned && t.spawned ? 0.015 : 0
          }),
      )
      .force(
        'charge',
        forceManyBody()
          // Soft repulsion — strong charge empties the center
          .strength((d) => ((d as SimNode).spawned ? -6 : 0))
          .distanceMax(28),
      )
      .force(
        'collide',
        forceCollide<SimNode>()
          .radius((d) => {
            if (!d.spawned) return 0
            return d.r * (d.scale ?? 1) + (d.tip?.kind === 'persona' || d.tip?.kind === 'objection' ? 3.2 : 2.1)
          })
          .strength(0.85)
          .iterations(3),
      )
      .force(
        'homeX',
        forceX<SimNode>()
          .x((d) => d.homeX ?? 50)
          .strength((d) => (d.spawned ? 0.12 : 0)),
      )
      .force(
        'homeY',
        forceY<SimNode>()
          .y((d) => d.homeY ?? 50)
          .strength((d) => (d.spawned ? 0.12 : 0)),
      )
      .velocityDecay(0.55)
      .alphaDecay(0.01)
      .alphaMin(0.001)
      .on('tick', () => {
        frame += 1
        const expanding = spawnCursor < pending.length

        // Appear near own home, linked from nearest living neighbor — not one explosion center
        if (frame % 2 === 0 && expanding) {
          const id = pending[spawnCursor]
          const child = nodes[id]
          const living = nodes.filter((n) => n.spawned)

          let parent = living[0]
          let best = Infinity
          for (const p of living) {
            const d =
              ((p.homeX ?? 0) - (child.homeX ?? 50)) ** 2 +
              ((p.homeY ?? 0) - (child.homeY ?? 50)) ** 2
            if (d < best) {
              best = d
              parent = p
            }
          }

          const hx = child.homeX ?? 50
          const hy = child.homeY ?? 50
          const px = parent?.x ?? hx
          const py = parent?.y ?? hy
          const t = 0.78

          child.spawned = true
          child.age = 0
          child.opacity = 0
          child.scale = 0.25
          child.fx = null
          child.fy = null
          child.x = px + (hx - px) * t + (Math.random() - 0.5) * 1.2
          child.y = py + (hy - py) * t + (Math.random() - 0.5) * 1.2
          child.vx = (hx - (child.x ?? hx)) * 0.1
          child.vy = (hy - (child.y ?? hy)) * 0.1

          spawnCursor += 1
          sim.alpha(Math.max(sim.alpha(), 0.16))
        }

        const alive = nodes.filter((n) => n.spawned)
        for (let i = 0; i < alive.length; i++) {
          for (let j = i + 1; j < alive.length; j++) {
            const a = alive[i]
            const b = alive[j]
            const dx = (b.x ?? 0) - (a.x ?? 0)
            const dy = (b.y ?? 0) - (a.y ?? 0)
            const dist = Math.hypot(dx, dy) || 0.01
            const minDist =
              a.tip?.kind === 'persona' ||
              a.tip?.kind === 'objection' ||
              b.tip?.kind === 'persona' ||
              b.tip?.kind === 'objection'
                ? 5.2
                : 3.0
            if (dist < minDist) {
              const push = ((minDist - dist) / dist) * 0.28
              a.x = (a.x ?? 0) - dx * push
              a.y = (a.y ?? 0) - dy * push
              b.x = (b.x ?? 0) + dx * push
              b.y = (b.y ?? 0) + dy * push
            }
          }
        }

        const padX = 8
        const padY = 18
        for (const n of nodes) {
          if (!n.spawned) {
            n.opacity = 0
            n.scale = 0.15
            continue
          }

          n.age = (n.age ?? 0) + 1
          const t = Math.min(1, (n.age ?? 0) / 24)
          const ease = t * t * (3 - 2 * t)
          n.opacity = ease
          n.scale = 0.3 + ease * 0.7

          n.x = Math.max(padX, Math.min(100 - padX, n.x ?? 50))
          n.y = Math.max(padY, Math.min(100 - padY, n.y ?? 52))

          const speed = Math.hypot(n.vx ?? 0, n.vy ?? 0)
          if (speed > 1.1) {
            n.vx = ((n.vx ?? 0) / speed) * 1.1
            n.vy = ((n.vy ?? 0) / speed) * 1.1
          }
        }
        setTick((v) => v + 1)
      })

    simRef.current = sim
    sim.alpha(0.12).restart()

    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [])

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 50, y: 50 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 50, y: 50 }
    const local = pt.matrixTransform(ctm.inverse())
    return {
      x: Math.max(3, Math.min(97, local.x)),
      y: Math.max(3, Math.min(97, local.y)),
    }
  }, [])

  const positionTooltip = useCallback((tip: TipData, el: Element) => {
    const nRect = el.getBoundingClientRect()
    const tipW = tip.kind === 'agent' ? 240 : 300
    const tipH = tip.kind === 'agent' ? 110 : 148
    const gap = 4

    let left = nRect.left + nRect.width / 2 - tipW / 2
    let top = nRect.top - tipH - gap

    if (left < 8) left = 8
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8

    if (top < 8) {
      top = nRect.bottom + gap
    }
    if (top + tipH > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - tipH - 8)
    }

    setTooltip({ tip, left, top })
  }, [])

  const onPointerDown = (e: React.PointerEvent, node: SimNode) => {
    e.preventDefault()
    e.stopPropagation()
    dragMoved.current = false
    setDraggingId(node.id)
    setTooltip(null)
    clearHide()

    const sim = simRef.current
    if (!sim) return

    node.fx = node.x
    node.fy = node.y
    sim.alphaTarget(0.08).restart()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      dragMoved.current = true
      const { x, y } = clientToSvg(ev.clientX, ev.clientY)
      node.fx = x
      node.fy = y
      sim.alpha(Math.max(sim.alpha(), 0.06))
    }

    const onUp = () => {
      // Soft release — mild inertia, no sharp restart
      node.fx = null
      node.fy = null
      sim.alphaTarget(0).alpha(0.06).restart()
      setDraggingId(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onHoverEnter = (e: React.PointerEvent, node: SimNode) => {
    if (draggingId !== null || !node.tip) return
    clearHide()
    positionTooltip(node.tip, e.currentTarget)
  }

  const onHoverLeave = () => {
    if (draggingId !== null) return
    clearHide()
    hideTimer.current = setTimeout(() => setTooltip(null), 100)
  }

  // silence unused tick lint by using it in render key path
  void tick

  const nodes = nodesRef.current
  const links = linksRef.current

  return (
    <div
      ref={containerRef}
      className="absolute top-16 right-0 bottom-8 z-[5] w-full lg:w-[72%]"
      style={{
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, black 48%)',
        WebkitMaskComposite: 'source-in',
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, black 48%)',
        maskComposite: 'intersect',
      }}
    >
      <div className="absolute inset-0">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full touch-none"
        >
          {links.map((l, i) => {
            const s = l.source as SimNode
            const t = l.target as SimNode
            if (!s.spawned || !t.spawned) return null
            const lineOp = Math.min(s.opacity ?? 0, t.opacity ?? 0) * 0.45
            if (lineOp < 0.02) return null
            return (
              <line
                key={`e-${i}`}
                x1={s.x ?? 0}
                y1={s.y ?? 0}
                x2={t.x ?? 0}
                y2={t.y ?? 0}
                stroke="#52525b"
                strokeWidth={0.16}
                strokeOpacity={lineOp}
                pointerEvents="none"
              />
            )
          })}

          {nodes.map((n) => {
            if (!n.spawned && (n.opacity ?? 0) < 0.01) return null
            const hoverable = Boolean(n.tip)
            return (
              <g
                key={n.id}
                className={draggingId === n.id ? 'cursor-grabbing' : 'cursor-grab'}
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => onPointerDown(e, n)}
                onPointerEnter={(e) => onHoverEnter(e, n)}
                onPointerLeave={onHoverLeave}
              >
                <circle
                  cx={n.x ?? 0}
                  cy={n.y ?? 0}
                  r={Math.max(n.r + 1.2, hoverable ? 2.2 : 1.8)}
                  fill="transparent"
                />
                <NodeGeom node={n} />
              </g>
            )
          })}
        </svg>
      </div>

      {tooltip &&
        draggingId === null &&
        createPortal(
          <div
            role="tooltip"
            className={`pointer-events-none fixed z-[9999] w-[min(100vw-1rem,18.75rem)] border bg-zinc-950/98 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md ${
              tooltip.tip.kind === 'objection'
                ? 'border-red-900/80'
                : tooltip.tip.kind === 'persona'
                  ? 'border-emerald-800/80'
                  : 'border-zinc-700'
            }`}
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            <TooltipCard tip={tooltip.tip} />
          </div>,
          document.body,
        )}
    </div>
  )
}
