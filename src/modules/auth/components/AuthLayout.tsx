import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { useTenant } from '@/shared/hooks/useTenant'

/*
 * Palette for the signed-out screens, matched to E5 Energy's branding.
 *
 *   brand-primary    buttons, links, focus accents. #0A6659 for E5 (the
 *                    teal in their logo), set by the tenant theme.
 *   brand-secondary  the site-plan panel. #0C352F for E5 (the deep green of
 *                    their website hero), also from the tenant theme.
 *   ink    #1A2B28   headings and body text
 *   mint   #A3E2D7   focus rings, panel linework
 *   canvas #F2F8F7   page background
 *
 * The two brand colours come from the same CSS variables as the rest of the
 * dashboard, so rebranding a deployment restyles these pages too. The panel
 * assumes a dark secondary colour, since its text is white.
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  /** Secondary links and help text under the form. */
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const tenant = useTenant()
  const logoUrl = (tenant as { logoUrl?: string } | undefined)?.logoUrl || undefined

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-[#F2F8F7] text-[#1A2B28] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-1">
      <SitePanel tenantName={tenant?.name} />

      <main className="relative -mt-10 flex items-start justify-center px-4 pb-12 sm:px-6 lg:mt-0 lg:items-center lg:py-12">
        <div className="w-full max-w-[25rem]">
          <div className="rounded-2xl border border-[#1A2B28]/[0.06] bg-white p-6 shadow-[0_1px_2px_rgb(var(--brand-secondary)/0.06),0_12px_32px_-12px_rgb(var(--brand-secondary)/0.18)] sm:p-8">
            {logoUrl && (
              // The logo sits on the white card: client logos are drawn for
              // light backgrounds, and this keeps it off the dark panel
              // without needing a tile behind it.
              <img
                src={logoUrl}
                alt={tenant?.name ?? 'Company logo'}
                className="mb-6 h-11 w-auto sm:h-12"
              />
            )}
            <h1 className="font-display text-[1.625rem] font-semibold leading-tight tracking-[-0.01em]">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#1A2B28]/70">{subtitle}</p>

            <div className="mt-7">{children}</div>
          </div>

          {footer && (
            <div className="mt-5 space-y-1.5 px-1 text-center text-[0.8125rem] leading-relaxed text-[#1A2B28]/70">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * The brand side: a stylised site plan with helmet locators on it, echoing
 * the Live Map the operator lands on after signing in. On phones it shrinks
 * to a header band so the form stays above the fold.
 */
function SitePanel({ tenantName }: { tenantName?: string }) {
  return (
    <aside className="relative isolate flex h-56 flex-col justify-between overflow-hidden bg-brand-secondary px-6 pb-[4.5rem] pt-5 text-white sm:h-64 sm:pb-20 sm:px-8 lg:h-auto lg:px-12 lg:py-10">
      <SitePlan />
      <PlexusField />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-brand-secondary via-brand-secondary/70 to-transparent" />

      <div className="flex items-center gap-2.5">
        <HelmetMark />
        <span className="text-sm font-medium text-white/90">{tenantName ?? 'E5 Smart Helmet'}</span>
      </div>

      <div className="max-w-md">
        <p className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[2.5rem] lg:text-[3.25rem]">
          Command Centre
        </p>
        <p className="mt-3 hidden max-w-sm text-[0.9375rem] leading-relaxed text-[#A3E2D7] sm:block">
          Live location, alarms and gas readings for every helmet in the fleet.
        </p>
      </div>
    </aside>
  )
}

function SitePlan() {
  const patternId = useId()

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke="#A3E2D7" strokeOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="400" height="600" fill={`url(#${patternId})`} />

      {/* Contour lines, like elevation on a site survey. */}
      <g fill="none" stroke="#A3E2D7" strokeOpacity="0.16" strokeWidth="1">
        <path d="M-20 140C60 110 110 180 190 160S320 70 420 110" />
        <path d="M-20 190C70 160 120 235 200 212S330 120 420 160" />
        <path d="M-20 250C80 222 130 290 210 268S340 180 420 220" />
        <path d="M-20 420C60 380 150 450 240 410S350 350 420 380" />
        <path d="M-20 470C70 432 160 500 250 462S360 400 420 430" />
      </g>

      {/* Site boundary and a haul road. */}
      <path
        d="M70 120L310 96L352 330L268 470L96 436Z"
        fill="#0A6659"
        fillOpacity="0.18"
        stroke="#A3E2D7"
        strokeOpacity="0.35"
        strokeDasharray="4 6"
      />
      <path
        d="M-10 520C90 470 170 380 230 300S330 180 410 150"
        fill="none"
        stroke="#A3E2D7"
        strokeOpacity="0.22"
        strokeWidth="10"
        strokeLinecap="round"
      />

    </svg>
  )
}

// ---------------------------------------------------------------------------
// Plexus: drifting nodes joined by lines that fade with distance
// ---------------------------------------------------------------------------

const MINT = '163, 226, 215' // #A3E2D7 as an rgb triplet for rgba()

interface PlexusNode {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** Larger nodes stand in for helmets and carry a slow pulse. */
  helmet: boolean
  phase: number
}

interface Packet {
  a: number
  b: number
  t: number
}

/**
 * Canvas layer behind the panel copy. Motion is deliberately slow (a node
 * crosses the panel in a minute or two) so it reads as ambient, not as
 * something competing with the form. Nodes wrap at the edges, so the loop
 * never visibly resets. With reduced motion requested, one still frame is
 * drawn and nothing animates.
 */
function PlexusField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let linkDistance = 120
    let nodes: PlexusNode[] = []
    let seededArea = 0
    const packets: Packet[] = []
    let frame = 0
    let last = performance.now()
    let running = true

    function seed() {
      const area = width * height
      const count = Math.max(14, Math.min(56, Math.round(area / 9500)))
      linkDistance = width < 640 ? 92 : 140
      nodes = Array.from({ length: count }, (_, i) => {
        const angle = Math.random() * Math.PI * 2
        const speed = 5 + Math.random() * 9 // px per second
        const helmet = i < Math.max(3, Math.round(count / 10))
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: helmet ? 2.6 : 1.1 + Math.random() * 0.9,
          helmet,
          phase: Math.random() * Math.PI * 2,
        }
      })
      packets.length = 0
      seededArea = area
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const prevWidth = width
      const prevHeight = height
      width = rect.width
      height = rect.height
      if (width === 0 || height === 0) return
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Reseed on first layout, or when the panel changes size enough that
      // the node count would be wrong (e.g. the initial 300x150 canvas
      // default before CSS sizing applies, or rotating a tablet).
      const areaRatio = (width * height) / (seededArea || 1)
      if (nodes.length === 0 || prevWidth === 0 || prevHeight === 0 || areaRatio > 1.6 || areaRatio < 0.6) seed()
      else {
        // Stretch the existing field to the new size rather than reseeding,
        // so a window resize doesn't make the network jump.
        const sx = width / prevWidth
        const sy = height / prevHeight
        for (const n of nodes) {
          n.x *= sx
          n.y *= sy
        }
        linkDistance = width < 640 ? 92 : 140
      }
      if (reduceMotion) draw(0)
    }

    function step(dt: number) {
      const margin = 20
      for (const n of nodes) {
        n.x += n.vx * dt
        n.y += n.vy * dt
        if (n.x < -margin) n.x = width + margin
        else if (n.x > width + margin) n.x = -margin
        if (n.y < -margin) n.y = height + margin
        else if (n.y > height + margin) n.y = -margin
      }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height)
      const maxSq = linkDistance * linkDistance
      const links: Array<[number, number]> = []

      // Lines first, so nodes sit on top of them.
      ctx!.lineWidth = 0.8
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dSq = dx * dx + dy * dy
          if (dSq > maxSq) continue
          const closeness = 1 - Math.sqrt(dSq) / linkDistance
          // Squared falloff: links fade in gently rather than popping.
          const alpha = closeness * closeness * 0.5
          ctx!.strokeStyle = `rgba(${MINT}, ${alpha})`
          ctx!.beginPath()
          ctx!.moveTo(a.x, a.y)
          ctx!.lineTo(b.x, b.y)
          ctx!.stroke()
          links.push([i, j])
        }
      }

      // Occasional packets of "data" travelling along a live link.
      if (!reduceMotion && packets.length < 4 && links.length > 0 && Math.random() < 0.02) {
        const [a, b] = links[Math.floor(Math.random() * links.length)]
        packets.push(Math.random() < 0.5 ? { a, b, t: 0 } : { a: b, b: a, t: 0 })
      }
      for (let k = packets.length - 1; k >= 0; k--) {
        const pk = packets[k]
        const a = nodes[pk.a]
        const b = nodes[pk.b]
        const dx = b.x - a.x
        const dy = b.y - a.y
        // Drop a packet whose link has stretched past breaking point.
        if (pk.t >= 1 || dx * dx + dy * dy > maxSq) {
          packets.splice(k, 1)
          continue
        }
        const x = a.x + dx * pk.t
        const y = a.y + dy * pk.t
        const fade = Math.sin(pk.t * Math.PI)
        ctx!.fillStyle = `rgba(${MINT}, ${0.9 * fade})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx!.fill()
      }

      // Nodes, with a soft halo; helmet nodes breathe slowly.
      for (const n of nodes) {
        const pulse = n.helmet && !reduceMotion ? 0.5 + 0.5 * Math.sin(time / 900 + n.phase) : 0.5
        const halo = n.helmet ? 9 + pulse * 6 : n.r * 4
        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, halo)
        glow.addColorStop(0, `rgba(${MINT}, ${n.helmet ? 0.28 + pulse * 0.12 : 0.18})`)
        glow.addColorStop(1, `rgba(${MINT}, 0)`)
        ctx!.fillStyle = glow
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, halo, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.fillStyle = `rgba(${MINT}, ${n.helmet ? 0.95 : 0.7})`
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function loop(now: number) {
      if (!running) return
      // Cap the step so returning to a background tab doesn't teleport nodes.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(dt)
      for (const pk of packets) pk.t += dt / 1.6
      draw(now)
      frame = requestAnimationFrame(loop)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    // Stop drawing while the panel is off screen (e.g. scrolled away on a phone).
    const visibility = new IntersectionObserver(([entry]) => {
      if (reduceMotion) return
      if (entry.isIntersecting && !running) {
        running = true
        last = performance.now()
        frame = requestAnimationFrame(loop)
      } else if (!entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(frame)
      }
    })
    visibility.observe(canvas)

    if (!reduceMotion) frame = requestAnimationFrame(loop)
    else running = false

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibility.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full" />
}

function HelmetMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A3E2D7] text-brand-secondary">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 16a7.5 7.5 0 0 1 15 0" />
        <path d="M12 8.5V16" />
        <path d="M2.5 16h19" />
        <path d="M3.5 16v1.5h17V16" />
      </svg>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const inputBase =
  'block w-full rounded-lg border bg-white py-2.5 pl-10 text-[0.9375rem] text-[#1A2B28] ' +
  'placeholder:text-[#1A2B28]/40 transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-brand-primary focus:outline-none focus:ring-[3px] focus:ring-[#A3E2D7]'

function borderFor(error?: string) {
  return error ? 'border-red-600' : 'border-[#1A2B28]/15 hover:border-[#1A2B28]/30'
}

interface FieldProps {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  autoComplete: string
}

export function UsernameField({ label, registration, error, autoComplete }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium">
        {label}
      </label>
      <div className="relative">
        <FieldIcon>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </FieldIcon>
        <input
          {...registration}
          id={id}
          type="text"
          autoComplete={autoComplete}
          // Usernames are case-sensitive, and phone keyboards capitalise the
          // first letter by default — "Admin" fails where "admin" works.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${inputBase} ${borderFor(error)} pr-3`}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

export function PasswordField({ label, registration, error, autoComplete }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const capsId = `${id}-caps`
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const describedBy = [error && errorId, capsLock && capsId].filter(Boolean).join(' ') || undefined

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium">
        {label}
      </label>
      <div className="relative">
        <FieldIcon>
          <rect x="5" y="10.5" width="14" height="10" rx="2" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </FieldIcon>
        <input
          {...registration}
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
          onBlur={(e) => {
            setCapsLock(false)
            void registration.onBlur(e)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputBase} ${borderFor(error)} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#1A2B28]/50 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#A3E2D7]"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.75" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {capsLock && (
        <p id={capsId} className="mt-1.5 text-xs text-brand-primary">
          Caps Lock is on.
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#1A2B28]/40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-xs text-red-700">
      {message}
    </p>
  )
}

/** Form-level failure, e.g. wrong credentials. Announced to screen readers. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.8125rem] text-red-800">
      {message}
    </p>
  )
}

export function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-primary px-4 py-3 text-[0.9375rem] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_-8px_rgb(var(--brand-primary)/0.7)] transition-[background-color,transform,box-shadow] duration-150 hover:brightness-[.92] hover:shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_22px_-10px_rgb(var(--brand-primary)/0.8)] active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#A3E2D7] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
    >
      {/* A sheen that crosses the button on hover. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/15 opacity-0 transition-[left,opacity] duration-500 ease-out group-hover:left-[110%] group-hover:opacity-100 motion-reduce:hidden"
      />
      {busy && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      <span className="relative">{busy ? busyLabel : children}</span>
    </button>
  )
}

export const authLink =
  'font-medium text-brand-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E2D7]'
