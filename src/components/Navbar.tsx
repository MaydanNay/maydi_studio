import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { ContactsHover } from './ContactsHover'

type NavbarProps = {
  onBookCall: () => void
}

const links: { href: string; label: string; external?: boolean }[] = [
  { href: '#problem', label: 'Проблема' },
  { href: '#solution', label: 'Метод' },
  { href: '#founders', label: 'Фаундеры' },
  { href: 'https://maydi.net', label: 'Кейсы', external: true },
  { href: '#pricing', label: 'Пакеты' },
  { href: '#ai-roaster', label: 'AI-прожарка' },
  { href: '#faq', label: 'FAQ' },
]

export function Navbar({ onBookCall }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors ${
        scrolled || open
          ? 'border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#hero"
          className="site-header__logo inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-white"
        >
          <img
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px] object-contain"
          />
          <span>maydiStudio</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                {...(l.external
                  ? { target: '_blank', rel: 'noreferrer' }
                  : {})}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-50"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ContactsHover variant="nav" placement="bottom" />
          <button
            type="button"
            onClick={onBookCall}
            className="hidden border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-50 transition-colors hover:border-zinc-50 hover:bg-zinc-50 hover:text-zinc-950 sm:inline-flex"
          >
            Разбор
          </button>
          <button
            type="button"
            className="inline-flex text-zinc-400 transition-colors hover:text-zinc-50 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 md:hidden">
          <ul className="flex flex-col px-4 py-3">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  {...(l.external
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                  className="block py-3 text-sm text-zinc-400 transition-colors hover:text-zinc-50"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-2 pb-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onBookCall()
                }}
                className="w-full border border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:border-zinc-50 hover:bg-zinc-50 hover:text-zinc-950"
              >
                Забронировать разбор
              </button>
              <div className="border border-zinc-800 px-3 py-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Контакты
                </p>
                <ul className="space-y-3">
                  <li>
                    <p className="text-sm text-zinc-50">Найманов Майдан</p>
                    <a href="https://t.me/MaydanMR" className="block font-mono text-xs text-zinc-400">@MaydanMR</a>
                    <a href="tel:+77024383624" className="block font-mono text-xs text-zinc-400">+77024383624</a>
                  </li>
                  <li>
                    <p className="text-sm text-zinc-50">Бушанская Диана</p>
                    <a href="https://t.me/chmahustle" className="block font-mono text-xs text-zinc-400">@chmahustle</a>
                    <a href="tel:+77470470059" className="block font-mono text-xs text-zinc-400">+77470470059</a>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
