import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTenant } from '@/shared/hooks/useTenant'
import { endSession } from '@/shared/lib/session'
import { ConnectionBadge } from './ConnectionBadge'

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { user } = useAuth()
  const tenant = useTenant()
  const navigate = useNavigate()

  async function handleLogout() {
    // endSession also stops the socket and clears the query cache — otherwise
    // the next person to sign in on this browser sees the old fleet flash.
    await endSession({ notifyBackend: true })
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-chrome flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1.5 rounded p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* The tenant name lives in the sidebar on desktop, which is off-screen
          on mobile — without this a white-labelled phone view shows no brand. */}
      <span className="truncate font-medium text-slate-800 md:hidden">{tenant?.name}</span>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <ConnectionBadge />
        <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
        <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">
          {user?.role}
        </span>

        {/* Account security (2FA). Just the shield on phones, where the top
            bar has no room for another word. */}
        <NavLink
          to="/account/security"
          aria-label="Account security"
          className={({ isActive }) =>
            `flex items-center gap-1.5 rounded text-sm ${
              isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="hidden sm:inline">Security</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
