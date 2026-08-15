import { useEffect, useState } from 'react'

export function getPath() {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

export function navigate(to: string) {
  const url = new URL(to, window.location.origin)
  const nextPath = url.pathname.replace(/\/+$/, '') || '/'
  const pathChanged = getPath() !== nextPath
  window.history.pushState({}, '', `${url.pathname}${url.hash}`)
  window.dispatchEvent(new Event('app:nav'))

  if (url.hash) {
    if (pathChanged) return
    document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' })
    return
  }

  if (!pathChanged) window.scrollTo(0, 0)
}

export function usePath() {
  const [path, setPath] = useState(getPath)

  useEffect(() => {
    const sync = () => setPath(getPath())
    window.addEventListener('popstate', sync)
    window.addEventListener('app:nav', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('app:nav', sync)
    }
  }, [])

  return path
}
