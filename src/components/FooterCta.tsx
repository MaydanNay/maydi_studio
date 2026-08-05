import { ArrowRight } from 'lucide-react'
import { ContactsHover } from './ContactsHover'

type FooterCtaProps = {
  onBookCall: () => void
}

export function FooterCta({ onBookCall }: FooterCtaProps) {
  return (
    <section className="border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="relative overflow-hidden border border-zinc-800 bg-zinc-950 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 opacity-30 grid-bg" />
          <div className="relative">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Final CTA
            </p>
            <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Готовы перестать сливать бюджет на слепые гипотезы?
            </h2>
            <button
              type="button"
              onClick={onBookCall}
              className="mt-8 inline-flex items-center justify-center gap-2 bg-zinc-50 px-6 py-3.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Забронировать 15-минутный созвон с фаундерами
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-mono text-xs text-zinc-600">
            © 2026 maydiStudio / mimora / Republic of Kazakhstan.
          </p>
          <nav className="flex flex-wrap items-center gap-6">
            <a href="#hero" className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50">
              Home
            </a>
            <a href="#pricing" className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50">
              Pricing
            </a>
            <a href="#ai-roaster" className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50">
              AI Roast
            </a>
            <a href="#faq" className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50">
              FAQ
            </a>
            <a
              href="https://maydi.net"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-50"
            >
              Кейсы
            </a>
            <ContactsHover variant="footer" placement="top" />
          </nav>
        </div>
      </footer>
    </section>
  )
}
