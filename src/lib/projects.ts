import origanimaOverlay from '../assets/origanima.png'

export type Project = {
  slug: string
  name: string
  tag: string
  blurb: string
  url: string
  year: string
  role: string
  note: string
  hero: string
  heroSize: string
  heroTone?: 'dark' | 'light'
  overlay?: string
  gallery: string[]
  preview: { w: number; h: number }
}

export const projects: Project[] = [
  {
    slug: 'mimora',
    name: 'mimora',
    tag: 'AI-симуляция',
    blurb: 'Симулируй реальность до того как она случится',
    url: 'https://mimora.io/',
    year: '2025',
    role: 'Product · AI-симуляция',
    note: 'Прогони решение через AI-население до запуска. Узнай реакцию, возражения и получи версию, которая сработает - без живого трафика и недель A/B.',
    hero: '/projects/mimora.png',
    heroSize: '16vw',
    heroTone: 'dark',
    gallery: ['/projects/mimora-2.jpg', '/projects/mimora-3.jpg', '/projects/mimora-4.jpg'],
    preview: { w: 360, h: 200 },
  },
  {
    slug: 'origanima',
    name: 'origanima',
    tag: 'AI-конвейеры',
    blurb: 'Десятки готовых AI-шаблонов для бизнеса',
    url: 'https://origanima.com/',
    year: '2026',
    role: 'Product · AI-конвейеры',
    note: 'Примерка, видео, карточки маркетплейсов, постеры. Собери конвейер из нод один раз - бренд-кит закреплён, дальше только Run.',
    hero: '/projects/origanima.jpg',
    heroSize: '11.5vw',
    heroTone: 'dark',
    overlay: origanimaOverlay,
    gallery: ['/projects/origanima-2.png', '/projects/origanima-3.png', '/projects/origanima-4.png'],
    preview: { w: 210, h: 268 },
  },
  {
    slug: 'eichholtz',
    name: 'Eichholtz',
    tag: 'E-commerce',
    blurb: 'Премиальная мебель из Нидерландов',
    url: 'https://eichholtz.kz/',
    year: '2026',
    role: 'Development · E-commerce',
    note: 'Официальный интернет-магазин бренда Eichholtz в Казахстане. Каталог дизайнерской мебели, света и аксессуаров премиум-класса.',
    hero: '/projects/mimora.png',
    heroSize: '14vw',
    heroTone: 'light',
    gallery: [],
    preview: { w: 320, h: 200 },
  },
]

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug) ?? null
}

export function getNextProject(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug)
  if (i < 0) return projects[0]
  return projects[(i + 1) % projects.length]
}
