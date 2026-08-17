import { motion } from 'framer-motion'
import butterflyFooter from '../assets/butterfly_footer.png'
import { ContactsHover } from './ContactsHover'
import { navigate } from '../lib/nav'

type FooterCtaProps = {
  onBookCall?: () => void
}

const ease = [0.22, 1, 0.36, 1] as const

const sections = [
  {
    title: 'Разделы',
    links: [
      { href: '#problem', label: 'Проблема' },
      { href: '#solution', label: 'Метод' },
      { href: '#how-it-works', label: 'Как работает' },
      { href: '#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Студия',
    links: [
      { href: '/founders', label: 'Фаундеры' },
      { href: '#cases', label: 'Кейсы' },
      { href: '#ai-roaster', label: 'AI-прожарка' },
      { href: '#contact', label: 'Контакт' },
    ],
  },
  {
    title: 'Проекты',
    links: [
      { href: '/projects/mimora', label: 'mimora' },
      { href: '/projects/origanima', label: 'origanima' },
      { href: 'https://maydi.net', label: 'maydi.net', external: true },
      { href: 'https://mimora.io/', label: 'mimora.io', external: true },
    ],
  },
] as const

function FooterLink({
  href,
  label,
  external,
}: {
  href: string
  label: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      onClick={(e) => {
        if (external || href.startsWith('http')) return
        e.preventDefault()
        navigate(href)
      }}
      className="font-sans text-[12px] font-medium uppercase tracking-[0.06em] text-[#111111] transition-opacity hover:opacity-45 md:text-[13px]"
    >
      {label}
      {external ? ' ↗' : ''}
    </a>
  )
}

export function FooterCta({ onBookCall: _onBookCall }: FooterCtaProps) {
  return (
    <footer id="contact" className="section-shell relative overflow-hidden">
      <div className="page-columns" aria-hidden />

      {/* Butterfly - full width, lower */}
      <div className="relative z-[5] mx-auto flex min-h-[56vh] w-full items-end justify-center md:min-h-[62vh]">
        <motion.img
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 1, ease }}
          src={butterflyFooter}
          alt=""
          className="pointer-events-none w-full max-w-none translate-y-[58%] select-none object-contain object-bottom"
          draggable={false}
          aria-hidden
        />
      </div>

      {/* Links - slightly higher */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.65, ease }}
        className="absolute inset-x-0 top-[18%] z-20 mx-auto w-full max-w-[1400px] px-5 md:top-[20%] md:px-8"
      >
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title} className="min-w-0">
              <p className="mb-4 border-b border-[#111111] pb-3 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.16em] text-[#6b6b6b]">
                {section.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <FooterLink
                      href={link.href}
                      label={link.label}
                      external={'external' in link ? link.external : false}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 flex flex-col justify-between gap-6 sm:col-span-3 md:col-span-1">
            <div>
              <p className="mb-4 border-b border-[#111111] pb-3 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.16em] text-[#6b6b6b]">
                Связь
              </p>
              <ContactsHover variant="footer" placement="bottom" />
            </div>
            <p className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.14em] text-[#6b6b6b]">
              © 2026 maydiStudio
            </p>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
