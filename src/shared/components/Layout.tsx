import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ScopeBanner } from './ScopeBanner'
import { ErrorBoundary } from './ErrorBoundary'

// App-shell layout: the page itself never scrolls, only <main> does. That
// removes the need for a sticky sidebar entirely — a sticky flex child can end
// up painted over the content instead of beside it.
export function Layout() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // Close the drawer on navigation, or tapping a nav item leaves the overlay
  // sitting on top of the page it just opened.
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
        {/* Transparent so the canvas behind shows through as this scrolls. */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Shown once, above every page, rather than repeated per module. */}
          <ScopeBanner />
          {/* Keyed on the path so navigating away from a crashed page clears
              the error, rather than leaving the fallback stuck there. */}
          <ErrorBoundary key={location.pathname} label="This page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
