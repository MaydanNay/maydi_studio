import { useState, useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { ContactsHover } from './ContactsHover'
import { navigate, usePath } from '../lib/nav'

type NavbarProps = {
  onBookCall: () => void
}

const links: { href: string; label: string; external?: boolean }[] = [
  { href: '#problem', label: 'Проблема' },
  { href: '#solution', label: 'Метод' },
  { href: '#how-it-works', label: 'Как работает' },
  { href: '/founders', label: 'Фаундеры' },
  { href: '#cases', label: 'Кейсы' },
  { href: '#ai-roaster', label: 'AI-прожарка' },
  { href: '#faq', label: 'FAQ' },
]

const logoEase = [0.22, 1, 0.36, 1] as const

const logoTransition = {
  duration: 0.6,
  ease: logoEase,
}

const STUDIO_GAP = 4

const navLinkClass =
  'font-[family-name:var(--font-brand)] text-xs font-light tracking-tight text-white'

const studioTextClass =
  'whitespace-nowrap font-medium text-sm sm:text-base font-[family-name:var(--font-brand)] tracking-[-0.03em] text-white'

function SiteLogo({ scrolled }: { scrolled: boolean }) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const [studioWidth, setStudioWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return

    const measure = () => setStudioWidth(el.offsetWidth)
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <a
      href="/"
      onClick={(e) => {
        e.preventDefault()
        navigate('/')
      }}
      className="site-header__logo pointer-events-auto absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center font-[family-name:var(--font-brand)] text-sm leading-none tracking-[-0.03em] text-white sm:text-base"
      aria-label="maydiStudio"
    >
      <span className="shrink-0 font-semibold">.md</span>

      <span ref={measureRef} aria-hidden className={`pointer-events-none invisible absolute ${studioTextClass}`}>
        Studio
      </span>

      <motion.span
        initial={false}
        animate={{
          opacity: scrolled ? 0 : 1,
          maxWidth: scrolled ? 0 : (studioWidth ?? undefined),
          marginLeft: scrolled ? 0 : STUDIO_GAP,
        }}
        transition={logoTransition}
        className={`inline-block overflow-hidden ${studioTextClass}`}
        aria-hidden={scrolled}
      >
        Studio
      </motion.span>
    </a>
  )
}

export function Navbar({ onBookCall }: NavbarProps) {
  const path = usePath()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const isHome = path === '/'
  const isHeroPage = isHome || path.startsWith('/projects')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    // App scrolls to top on route change after this effect — resync next frames
    const a = requestAnimationFrame(onScroll)
    const b = requestAnimationFrame(() => requestAnimationFrame(onScroll))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
      window.removeEventListener('scroll', onScroll)
    }
  }, [path])

  useEffect(() => {
    if (!scrolled) setOpen(false)
  }, [scrolled])

  const showNav = scrolled || open || !isHeroPage

  const hrefFor = (href: string) => {
    if (href.startsWith('#') && !isHome) return `/${href}`
    return href
  }

  const onNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('http')) return
    event.preventDefault()
    setOpen(false)
    if (href.startsWith('#')) navigate(isHome ? href : `/${href}`)
    else navigate(href)
  }

  return (
    <>
      <div
        aria-hidden
        className={`site-header__blur pointer-events-none fixed inset-x-0 top-0 z-40 transition-opacity duration-500 ease-out ${
          open ? 'bottom-0' : 'h-[5.5rem] sm:h-24'
        } ${showNav ? 'opacity-100' : 'opacity-0'}`}
      />

      <header className="site-header-invert pointer-events-none fixed inset-x-0 top-0 z-50">
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <div
            className={`flex flex-1 items-center gap-6 transition-opacity duration-300 ${
              showNav ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <button
              type="button"
              className="inline-flex text-white lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              tabIndex={showNav ? 0 : -1}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>

            <ul className="hidden items-center gap-6 lg:flex">
              {links.slice(0, 4).map((l) => (
                <li key={l.href}>
                  <a
                    href={hrefFor(l.href)}
                    onClick={(e) => onNavClick(e, l.href)}
                    {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className={navLinkClass}
                    tabIndex={showNav ? 0 : -1}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <SiteLogo scrolled={scrolled} />

          <div
            className={`flex flex-1 items-center justify-end gap-3 transition-opacity duration-300 ${
              showNav ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ul className="hidden items-center gap-6 lg:flex">
              {links.slice(4).map((l) => (
                <li key={l.href}>
                  <a
                    href={hrefFor(l.href)}
                    onClick={(e) => onNavClick(e, l.href)}
                    {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className={navLinkClass}
                    tabIndex={showNav ? 0 : -1}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <ContactsHover variant="nav" placement="bottom" />
            <button
              type="button"
              onClick={onBookCall}
              className="hidden border border-white px-3 py-1.5 text-xs font-medium text-white sm:inline-flex"
              tabIndex={showNav ? 0 : -1}
            >
              Разбор
            </button>
          </div>
        </nav>

        {open && (
          <div className="pointer-events-auto border-t border-white/30 lg:hidden">
            <ul className="flex flex-col px-4 py-3">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={hrefFor(l.href)}
                    onClick={(e) => onNavClick(e, l.href)}
                    {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className={`block py-3 ${navLinkClass}`}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="space-y-2 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onBookCall()
                  }}
                  className="w-full border border-white px-3 py-2.5 text-sm font-medium text-white"
                >
                  Забронировать разбор
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>
    </>
  )
}
