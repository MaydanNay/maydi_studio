import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type SectionShellProps = {
  id: string
  title?: ReactNode
  lead?: ReactNode
  children: ReactNode
  className?: string
  tone?: 'default' | 'warm' | 'sage'
  headerClassName?: string
  titleAlign?: 'left' | 'right'
  compact?: boolean
  noHeader?: boolean
}

const ease = [0.22, 1, 0.36, 1] as const

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionShell({
  id,
  title,
  lead,
  children,
  className = '',
  tone = 'default',
  headerClassName = '',
  titleAlign = 'left',
  compact = false,
  noHeader = false,
}: SectionShellProps) {
  const titleCol =
    titleAlign === 'right' ? 'md:col-span-2 md:col-start-3' : 'md:col-span-2'
  const alignClass =
    titleAlign === 'right' ? 'text-right items-end' : 'text-left items-start'

  return (
    <section id={id} className={`section-shell section-shell--${tone} ${className}`}>
      <div className="page-columns" aria-hidden />
      <div
        className={`page-grid relative z-10 ${compact ? 'py-10 md:py-14' : 'py-14 md:py-20'}`}
      >
        {!noHeader && title ? (
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, ease }}
            className={`page-cell flex flex-col ${alignClass} ${titleCol} ${headerClassName}`}
          >
            <h2 className="section-title">{title}</h2>
            {lead ? <p className="section-lead">{lead}</p> : null}
          </motion.header>
        ) : null}

        {children}
      </div>
    </section>
  )
}
