import { NavLink } from 'react-router-dom'
import { MODULES } from '@/shared/constants/modules'
import { usePermission } from '@/shared/hooks/usePermission'
import { useTenant } from '@/shared/hooks/useTenant'
import { ModuleIcon } from './ModuleIcon'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tenant = useTenant()
  const can = usePermission()
  // Nav is generated from the shared module registry filtered by the
  // logged-in user's permissions — no per-role branching lives here.
  const visibleModules = MODULES.filter((m) => can(`${m.key}:read`))

  const brand = (
    <div className="flex min-w-0 items-center gap-2 px-4 py-4">
      {tenant?.logoUrl ? (
        <img src={tenant.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
      ) : (
        <div className="h-7 w-7 shrink-0 rounded bg-brand-primary" />
      )}
      <span className="truncate font-medium text-slate-800">{tenant?.name}</span>
    </div>
  )

  const nav = (
    <nav className="flex flex-col gap-1 px-2">
      {visibleModules.map((m) => (
        <NavLink
          key={m.key}
          to={m.route}
          end={m.route === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
              isActive
                ? 'bg-brand-primary/10 font-medium text-slate-900'
                : 'text-slate-600 hover:bg-slate-50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <ModuleIcon
                name={m.icon}
                className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-primary' : 'text-slate-400'}`}
              />
              <span className="truncate">{m.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop: a column in the app shell's flex row. */}
      <aside className="app-chrome hidden h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 md:flex">
        {brand}
        {nav}
      </aside>

      {/*
        Mobile: an overlay drawer. Kept mounted so it can slide rather than
        pop, but `invisible` when closed — which, unlike opacity or
        pointer-events, also takes it out of the tab order and the
        accessibility tree, so a screen reader doesn't announce a nav that
        isn't there.
      */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${open ? 'visible' : 'invisible'}`}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-64 flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-start justify-between">
            {brand}
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="m-3 rounded p-1 text-slate-400 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          {nav}
        </aside>
      </div>
    </>
  )
}
