import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ScopeBanner } from './ScopeBanner'
import { ErrorBoundary } from './ErrorBoundary'
import { SosBanner } from '@/modules/alarms/components/SosBanner'
import { LiveAlarms } from '@/modules/alarms/components/LiveAlarms'
import { ForbiddenNotice } from './ForbiddenNotice'

export function Layout() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setNavOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-canvas flex h-screen overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <ErrorBoundary label="Live alarms">
          <LiveAlarms />
          <SosBanner />
        </ErrorBoundary>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ScopeBanner />
          <ErrorBoundary key={location.pathname} label="This page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ForbiddenNotice />
    </div>
  )
}
