import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { navigate } from '../lib/nav'
import {
  getNextProject,
  projects,
  type Project,
} from '../lib/projects'
import { ProjectHeroMosaic } from './ProjectHeroMosaic'

type ProjectPageProps = {
  project: Project
}

const ease = [0.22, 1, 0.36, 1] as const

export function ProjectPage({ project }: ProjectPageProps) {
  const next = getNextProject(project.slug)
  const index = projects.findIndex((p) => p.slug === project.slug)

  useEffect(() => {
    document.title = `${project.name} - maydiStudio`
    return () => {
      document.title = 'maydiStudio'
    }
  }, [project.name])

  return (
    <article className="bg-[#111111] text-[#f3f3f3]">
      <ProjectHeroMosaic
        key={project.slug}
        src={project.hero}
        title={project.name}
        year={project.year}
        role={project.role}
        heroSize={project.heroSize}
        tone="dark"
        overlay={project.overlay}
        titleSpread={project.slug === 'origanima'}
      />

      <section className="section-shell relative text-[#111111]">
        <div className="page-columns" aria-hidden />
        <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-12 px-5 py-24 md:grid-cols-12 md:gap-8 md:px-8 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease }}
            className="md:col-span-5"
          >
            <p className="mb-4 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[#6b6b6b]">
              Project Overview
            </p>
            <h2 className="font-sans text-[clamp(1.6rem,3.4vw,2.6rem)] font-medium uppercase leading-[1.05] tracking-[0.04em] text-[#111111]">
              {project.name}
            </h2>
          </motion.div>

          <dl className="md:col-span-7">
            {[
              { label: 'Role', value: project.role },
              { label: 'Year', value: project.year },
              { label: 'Note', value: project.note },
            ].map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="grid grid-cols-1 gap-2 border-t border-[#111111] py-5 sm:grid-cols-[7rem_1fr] sm:gap-8"
              >
                <dt className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-[#6b6b6b]">
                  · {row.label}
                </dt>
                <dd className="font-sans text-[13px] font-medium uppercase leading-[1.7] tracking-[0.05em] text-[#111111] md:text-[15px]">
                  {row.value}
                </dd>
              </motion.div>
            ))}
            <div className="border-t border-[#111111] pt-8">
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.14em] text-[#111111] transition-opacity hover:opacity-55"
              >
                Launch Website ↗
              </a>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-[#f2f2f2]">
        {project.gallery.map((src) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.8, ease }}
            className="px-0 pb-10 last:pb-0 md:px-8 md:pb-28"
          >
            <img
              src={src}
              alt=""
              className="mx-auto max-h-[88vh] w-full object-cover md:w-[min(100%,1400px)]"
            />
          </motion.div>
        ))}
      </section>

      <a
        href={`/projects/${next.slug}`}
        onClick={(e) => {
          e.preventDefault()
          navigate(`/projects/${next.slug}`)
        }}
        className="group section-shell relative flex min-h-[50vh] flex-col justify-center text-[#111111] md:min-h-[60vh]"
      >
        <div className="page-columns" aria-hidden />
        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 md:px-8">
          <span className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[#6b6b6b]">
            <span className="block h-px w-5 bg-[#111111]" />
            Next Project
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[#6b6b6b]">
            <span className="text-[#111111]">
              {String(((index + 1) % projects.length) + 1).padStart(2, '0')}
            </span>
            {' / '}
            {String(projects.length).padStart(2, '0')}
          </span>
        </div>
        <p className="relative z-10 mt-10 px-5 text-center font-[family-name:var(--font-brand)] text-[clamp(2.4rem,10vw,8rem)] font-extrabold uppercase leading-[0.85] tracking-[-0.04em] text-[#111111] transition-opacity duration-300 group-hover:opacity-45 md:px-8">
          {next.name}
        </p>
      </a>
    </article>
  )
}
