import { useState, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { Solution } from './components/Solution'
import { Founders } from './components/Founders'
import { Cases } from './components/Cases'
import { Pricing } from './components/Pricing'
import { AiRoaster } from './components/AiRoaster'
import { Faq } from './components/Faq'
import { FooterCta } from './components/FooterCta'
import { LeadModal } from './components/LeadModal'
import type { LeadContext } from './lib/leads'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [leadContext, setLeadContext] = useState<LeadContext | null>(null)

  const openModal = useCallback((ctx?: LeadContext) => {
    setLeadContext(ctx ?? { source: 'booking' })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setLeadContext(null)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <Navbar onBookCall={() => openModal({ source: 'booking' })} />
      <main>
        <Hero onBookCall={() => openModal({ source: 'booking' })} />
        <Problem />
        <Solution />
        <Founders />
        <Cases />
        <Pricing onBookCall={() => openModal({ source: 'booking' })} />
        <AiRoaster onBookCall={openModal} />
        <Faq />
        <FooterCta onBookCall={() => openModal({ source: 'footer' })} />
      </main>
      <LeadModal open={modalOpen} onClose={closeModal} context={leadContext} />
    </div>
  )
}
