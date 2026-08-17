import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Mail, Phone } from 'lucide-react'

export const FOUNDERS = [
  {
    name: 'Найманов Майдан',
    telegram: 'MaydanMR',
    phone: '+77024383624',
    email: 'donttouchegoista@gmail.com',
  },
  {
    name: 'Бушанская Диана',
    telegram: 'chmahustle',
    phone: '+77470470059',
    email: 'diana.bush.bd@gmail.com',
  },
] as const

type ContactsHoverProps = {
  /** Visual style of the trigger */
  variant?: 'nav' | 'footer' | 'text'
  className?: string
  /** Popover opens upward (footer) or downward (nav) */
  placement?: 'top' | 'bottom'
  label?: string
}

export function ContactsHover({
  variant = 'footer',
  className = '',
  placement = 'top',
  label = 'Контакты',
}: ContactsHoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => clearClose(), [])

  const triggerClass =
    variant === 'nav'
      ? 'hidden items-center gap-1.5 border border-white px-3 py-1.5 text-xs font-medium text-white sm:inline-flex'
      : variant === 'footer'
        ? 'inline-flex items-center gap-1 font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50'
        : 'inline-flex items-center gap-1 font-mono text-xs text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-50 hover:underline'

  const chevronRotated =
    placement === 'top' ? (open ? 'rotate-0' : 'rotate-180') : open ? 'rotate-180' : 'rotate-0'

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => {
        clearClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        title={open ? 'Свернуть контакты' : 'Наведите или нажмите - показать контакты'}
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
      >
        {label}
        <ChevronDown
          size={12}
          strokeWidth={2}
          aria-hidden
          className={`shrink-0 opacity-60 transition-transform duration-200 ${chevronRotated}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Контакты фаундеров"
            initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-[min(100vw-2rem,20rem)] border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(39,39,42,0.4)] ${placement === 'top'
                ? 'bottom-full left-1/2 mb-2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0'
                : 'left-1/2 top-full mt-2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0'
              }`}
            onMouseEnter={clearClose}
            onMouseLeave={scheduleClose}
          >
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Founders / Direct
            </p>

            <ul className="space-y-4">
              {FOUNDERS.map((person) => (
                <li key={person.telegram} className="border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0">
                  <p className="mb-2 text-sm font-medium tracking-tight text-zinc-50">
                    {person.name}
                  </p>
                  <div className="space-y-1.5">
                    <a
                      href={`https://t.me/${person.telegram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-50"
                    >
                      <span className="text-zinc-600">TG</span>
                      @{person.telegram}
                    </a>
                    <a
                      href={`tel:${person.phone}`}
                      className="flex items-center gap-2 font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-50"
                    >
                      <Phone size={11} className="shrink-0 text-zinc-600" strokeWidth={1.5} />
                      {person.phone}
                    </a>
                    <a
                      href={`mailto:${person.email}`}
                      className="flex items-center gap-2 break-all font-mono text-[11px] text-zinc-400 transition-colors hover:text-zinc-50"
                    >
                      <Mail size={11} className="shrink-0 text-zinc-600" strokeWidth={1.5} />
                      {person.email}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
