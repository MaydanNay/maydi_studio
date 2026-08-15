import { useState, useCallback, useEffect } from 'react'
import { PageLoader } from './components/PageLoader'
import { SiteCursor } from './components/SiteCursor'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { Solution } from './components/Solution'
import { Founders } from './components/Founders'
import { Cases } from './components/Cases'
import { ProjectPage } from './components/ProjectPage'
import { AiRoaster } from './components/AiRoaster'
import { Faq } from './components/Faq'
import { FooterCta } from './components/FooterCta'
import { LeadModal } from './components/LeadModal'
import type { LeadContext } from './lib/leads'
import { navigate, usePath } from './lib/nav'
import { getProject } from './lib/projects'
import { SiteGrain } from './components/SiteGrain'

export default function App() {
  const path = usePath()
  const [loading, setLoading] = useState(true)
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

  const isHome = path === '/'
  const isFounders = path === '/founders'
  const onProjectRoute = path === '/projects' || path.startsWith('/projects/')
  const projectSlug = path.startsWith('/projects/')
    ? decodeURIComponent(path.slice('/projects/'.length))
    : ''
  const project = projectSlug ? getProject(projectSlug) : null

  useEffect(() => {
    if (onProjectRoute && !project) navigate('/#cases')
  }, [onProjectRoute, project])

  useEffect(() => {
    if (!isHome || !window.location.hash) {
      window.scrollTo(0, 0)
      return
    }
    const hash = window.location.hash
    const id = window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    }, 40)
    return () => window.clearTimeout(id)
  }, [isHome, path])

  return (
    <>
      <SiteCursor />
      {loading && <PageLoader onComplete={() => setLoading(false)} />}
      <div className="blueprint min-h-screen text-[#111111]">
        <Navbar onBookCall={() => openModal({ source: 'booking' })} />
        <main>
          {isFounders ? (
            <Founders />
          ) : project ? (
            <ProjectPage key={project.slug} project={project} />
          ) : onProjectRoute ? null : (
            <>
              <Hero onBookCall={() => openModal({ source: 'booking' })} />
              <Problem />
              <Solution />
              <Cases />
              <AiRoaster onBookCall={openModal} />
              <Faq />
              <FooterCta onBookCall={() => openModal({ source: 'footer' })} />
            </>
          )}
        </main>
        <LeadModal open={modalOpen} onClose={closeModal} context={leadContext} />
      </div>
      <SiteGrain />
    </>
  )
}
