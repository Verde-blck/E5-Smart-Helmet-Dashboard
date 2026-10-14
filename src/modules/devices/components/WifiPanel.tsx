import { useEffect, useRef, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { connectWifi, scanAndWait } from '../api/wifi.api'
import type { WifiNetwork, WifiScan } from '../api/wifi.api'
import type { DeviceView } from '../types'
import { SignalBars } from './SignalBars'

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'offline' }
  | { kind: 'no-report' }
  | { kind: 'list'; scan: WifiScan }
  | { kind: 'switching'; ssid: string; since: number; scan: WifiScan }

const SIGNAL_LABEL = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

/**
 * Moves a helmet onto another Wi-Fi network from the dashboard, replacing the
 * Anlink app. Scan, pick a network, enter its password; the helmet switches,
 * drops offline for a few seconds and comes back on the new network.
 */
export function WifiPanel({ device }: { device: DeviceView }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [chosen, setChosen] = useState<WifiNetwork | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const abort = useRef<AbortController | null>(null)

  // Stop polling if the operator leaves the page mid-scan.
  useEffect(() => () => abort.current?.abort(), [])

  // Ticks only while waiting for the helmet to come back.
  useEffect(() => {
    if (phase.kind !== 'switching') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [phase.kind])

  async function scan() {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setError(null)
    setChosen(null)
    setPassword('')
    setPhase({ kind: 'scanning' })
    try {
      const { delivered, scan } = await scanAndWait(device.id, controller.signal)
      if (controller.signal.aborted) return
      setPhase(!delivered ? { kind: 'offline' } : scan ? { kind: 'list', scan } : { kind: 'no-report' })
    } catch {
      if (!controller.signal.aborted) {
        setError('Couldn’t reach the server. Check your connection and try again.')
        setPhase({ kind: 'idle' })
      }
    }
  }

  async function connect() {
    if (!chosen || phase.kind !== 'list') return
    setError(null)
    try {
      const { delivered } = await connectWifi(device.id, chosen.ssid, password)
      if (!delivered) {
        setPhase({ kind: 'offline' })
        return
      }
      setPassword('')
      setPhase({ kind: 'switching', ssid: chosen.ssid, since: Date.now(), scan: phase.scan })
    } catch {
      setError('Couldn’t send the change. Check your connection and try again.')
    }
  }

  const waited = phase.kind === 'switching' ? Math.floor((now - phase.since) / 1000) : 0
  const backOnline = phase.kind === 'switching' && device.presence === 'online' && device.lastSeenAt > phase.since

  return (
    <Can perm="devices:write">
      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Wi-Fi</h2>
          <button
            onClick={() => void scan()}
            disabled={phase.kind === 'scanning'}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {phase.kind === 'scanning' ? 'Scanning…' : phase.kind === 'idle' ? 'Scan for networks' : 'Scan again'}
          </button>
        </div>

        {phase.kind === 'idle' && (
          <p className="text-xs text-slate-500">
            Move this helmet onto a site or office Wi-Fi network. The helmet needs to be online first.
          </p>
        )}

        {phase.kind === 'scanning' && (
          <p className="text-xs text-slate-500" aria-live="polite">
            Asking the helmet which networks it can see. This takes about 5 to 10 seconds.
          </p>
        )}

        {phase.kind === 'offline' && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">The helmet is offline, so it didn’t get the request.</p>
            <p className="mt-1">
              To bring it online without its usual network, turn on a phone hotspot named{' '}
              <b>E5-Setup</b> (with the E5 setup password), wait until this helmet shows online, then
              scan again.
            </p>
          </div>
        )}

        {phase.kind === 'no-report' && (
          <p className="text-xs text-amber-800">
            The helmet didn’t report its networks within 30 seconds. It may have a weak connection;
            try again.
          </p>
        )}

        {(phase.kind === 'list' || phase.kind === 'switching') && (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {phase.scan.networks.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500">No networks found nearby.</li>
            )}
            {phase.scan.networks.map((n) => {
              const selected = chosen?.ssid === n.ssid
              return (
                <li key={n.ssid}>
                  <button
                    onClick={() => {
                      setChosen(n)
                      setPassword('')
                      setError(null)
                    }}
                    disabled={phase.kind === 'switching' || n.connected}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                      selected ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                    } disabled:cursor-default disabled:hover:bg-transparent`}
                  >
                    <SignalBars
                      bars={n.signal as 0 | 1 | 2 | 3 | 4}
                      label={`Wi-Fi signal: ${SIGNAL_LABEL[n.signal]}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-800">{n.ssid}</span>
                    {n.connected && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        Connected
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {phase.kind === 'list' && chosen && (
          <div className="mt-3 rounded-md bg-slate-50 p-3">
            <label htmlFor="wifi-password" className="mb-1 block text-xs font-medium text-slate-600">
              Password for {chosen.ssid}
            </label>
            <div className="flex gap-2">
              <input
                id="wifi-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // Stops the browser offering the dashboard's own saved login here.
                autoComplete="new-password"
                spellCheck={false}
                className="min-w-0 flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded border border-slate-300 px-2 text-xs text-slate-600 hover:bg-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Leave it empty for an open network.</p>
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => void connect()}
                className="rounded bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
              >
                Connect helmet
              </button>
              <button onClick={() => setChosen(null)} className="text-xs text-slate-500 hover:text-slate-800">
                Cancel
              </button>
            </div>
          </div>
        )}

        {phase.kind === 'switching' && (
          <div
            aria-live="polite"
            className={`mt-3 rounded-md border px-3 py-2 text-xs ${
              backOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : waited >= 60
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {backOnline ? (
              <p>The helmet is back online. Scan again to confirm it’s on {phase.ssid}.</p>
            ) : waited >= 60 ? (
              <p>
                It hasn’t come back on {phase.ssid} after a minute, so the password was probably
                wrong. The helmet falls back to a network it knows (such as E5-Setup); scan again and
                retry.
              </p>
            ) : (
              <p>
                Switching to {phase.ssid}. The helmet drops offline for a few seconds while it
                changes networks ({waited}s).
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>
    </Can>
  )
}
