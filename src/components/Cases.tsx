import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { navigate } from '../lib/nav'
import { projects } from '../lib/projects'
import { FadeUp, LineReveal, staggerItem } from './MotionText'

export function Cases() {
  const previewRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: 0, y: 0 })
  const size = useRef({ w: 360, h: 200 })
  const [hover, setHover] = useState<number | null>(null)
  const lastHover = useRef(0)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.14
      pos.current.y += (target.current.y - pos.current.y) * 0.14
      const el = previewRef.current
      if (el) {
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const movePreview = (clientX: number, clientY: number, snap = false) => {
    const { w, h } = size.current
    let x = clientX + 22
    let y = clientY + 22
    if (x + w > window.innerWidth - 16) x = clientX - w - 22
    if (y + h > window.innerHeight - 16) y = clientY - h - 22
    x = Math.max(12, x)
    y = Math.max(12, y)
    target.current = { x, y }
    if (snap) pos.current = { x, y }
  }

  const openProject = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    event.preventDefault()
    navigate(`/projects/${slug}`)
  }

  return (
    <section
      id="cases"
      className="section-shell relative"
      onMouseMove={(e) => movePreview(e.clientX, e.clientY)}
      onMouseLeave={() => setHover(null)}
    >
      <div className="page-columns" aria-hidden />

      <div className="relative z-10 w-full py-20 md:py-28">
        <header className="mb-10 flex items-end justify-between gap-6 pr-5 md:mb-14 md:pr-8">
          <h2 className="w-[50vw] pl-5 font-sans text-[clamp(1.6rem,4.2vw,3.15rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111] md:pl-8">
            <LineReveal delay={0.05} className="block">
              Последние
            </LineReveal>
            <LineReveal delay={0.14} className="block w-full text-right">
              проекты
            </LineReveal>
          </h2>
          <FadeUp delay={0.22} y={8}>
            <p className="pb-1 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-[#6b6b6b]">
              26©
            </p>
          </FadeUp>
        </header>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
          }}
          className="mx-auto w-full max-w-[1400px] border-t border-[#111111] px-5 md:px-8"
        >
          {projects.map((project, i) => (
            <motion.a
              key={project.slug}
              variants={staggerItem}
              href={`/projects/${project.slug}`}
              onClick={(e) => openProject(e, project.slug)}
              onMouseEnter={(e) => {
                size.current = { w: project.preview.w, h: project.preview.h }
                const first = hover === null
                movePreview(e.clientX, e.clientY, first)
                lastHover.current = i
                setHover(i)
              }}
              className="group grid grid-cols-1 gap-2 border-b border-[#111111] py-6 md:grid-cols-12 md:items-baseline md:gap-4 md:py-9"
            >
              <span className="font-sans text-[clamp(1.35rem,2.6vw,2.15rem)] font-medium uppercase leading-[1.1] tracking-[0.04em] text-[#111111] transition-opacity duration-300 group-hover:opacity-45 md:col-span-4">
                {project.name}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.12em] text-[#6b6b6b] md:col-span-3">
                {project.tag}
              </span>
              <span className="font-sans text-[12px] font-medium uppercase leading-[1.5] tracking-[0.06em] text-[#111111] md:col-span-5 md:text-right md:text-[13px]">
                {project.blurb}
              </span>
            </motion.a>
          ))}
        </motion.div>

        <FadeUp delay={0.1}>
          <a
            href="https://maydi.net"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex px-5 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-[#111111] transition-opacity hover:opacity-60 md:px-8"
          >
            все проекты({projects.length})
          </a>
        </FadeUp>
      </div>

      <div
        ref={previewRef}
        className={`pointer-events-none fixed top-0 left-0 z-40 hidden overflow-hidden border border-[#111111] bg-[#111111] will-change-transform md:block ${
          hover === null ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          width: hover !== null ? projects[hover].preview.w : projects[lastHover.current].preview.w,
          height: hover !== null ? projects[hover].preview.h : projects[lastHover.current].preview.h,
          transition: 'opacity 0.22s ease, width 0.22s ease, height 0.22s ease',
        }}
        aria-hidden
      >
        <img
          src={hover !== null ? projects[hover].hero : projects[lastHover.current].hero}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  )
}
