import { useState } from 'react'
import { Can } from '@/shared/components/Can'
import type { DeviceView } from '@/modules/devices/types'
import { signalQuality } from '@/modules/devices/lib/signal'
import { SignalBars } from '@/modules/devices/components/SignalBars'
import { switchToMobileData } from '../api/wifi.api'

type Phase = 'idle' | 'confirm' | 'no-sim' | 'sending' | 'sent' | 'offline' | 'error'

export function ConnectionCard({ device }: { device: DeviceView }) {
  const t = device.telemetry
  const signal = signalQuality(t.signalStrength)
  const [phase, setPhase] = useState<Phase>('idle')
  const [noSimMessage, setNoSimMessage] = useState('')
  const onWifi = t.networkType === 'Wi-Fi'

  async function send(force: boolean) {
    setPhase('sending')
    try {
      const result = await switchToMobileData(device.id, force)
      if (result.status === 'no-sim') {
        setNoSimMessage(result.message)
        setPhase('no-sim')
      } else {
        setPhase(result.delivered ? 'sent' : 'offline')
      }
    } catch {
      setPhase('error')
    }
  }

  const rows: [string, string][] = [
    ['Connected over', t.networkType ?? '—'],
    ['Signal', signal ? `${signal.label} (${signal.detail})` : '—'],
    [
      'SIM card',
      t.simStatus === 'present' ? 'Present' : t.simStatus === 'absent' ? 'No SIM card' : 'Not reported',
    ],
    ['Phone number', t.simPhoneNumber ?? '—'],
    ['Mobile data this month', t.simDataUsedMb != null ? `${t.simDataUsedMb.toFixed(1)} MB` : '—'],
  ]

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Connection</h2>
        <SignalBars
          bars={device.presence !== 'offline' ? signal?.bars ?? null : null}
          label={signal ? `Signal: ${signal.label}` : 'Signal: not reported'}
        />
      </div>
      <dl className="grid grid-cols-[10rem_minmax(0,1fr)] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>

      <Can perm="wifi:write">
        <div className="mt-3 border-t border-slate-100 pt-3">
          {phase === 'idle' && (
            <button
              onClick={() => setPhase('confirm')}
              disabled={!onWifi || device.presence === 'offline'}
              title={!onWifi ? 'The helmet is already on mobile data, or not reporting its network.' : undefined}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Switch to mobile data
            </button>
          )}
          {phase === 'confirm' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p>
                The helmet will drop Wi-Fi and reconnect over 4G. If its SIM has no data, it stays
                offline until it’s back on a known Wi-Fi.
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => void send(false)} className="rounded bg-amber-600 px-2.5 py-1 font-medium text-white hover:bg-amber-700">
                  Switch now
                </button>
                <button onClick={() => setPhase('idle')} className="px-2 text-amber-900 hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {phase === 'no-sim' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p>
                {noSimMessage} Without a working SIM the helmet will go offline. Only send it anyway if
                you know a SIM was just fitted.
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => void send(true)} className="rounded border border-amber-400 px-2.5 py-1 font-medium hover:bg-amber-100">
                  Send anyway
                </button>
                <button onClick={() => setPhase('idle')} className="px-2 hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {phase === 'sending' && <p className="text-xs text-slate-500">Sending…</p>}
          {phase === 'sent' && (
            <p className="text-xs text-emerald-700">
              Sent. The helmet drops Wi-Fi now and should be back online over 4G shortly. To return it to
              Wi-Fi, connect it to a network below.
            </p>
          )}
          {phase === 'offline' && <p className="text-xs text-amber-800">The helmet is offline, so it didn’t get the command.</p>}
          {phase === 'error' && <p className="text-xs text-red-600">Couldn’t send the command. Try again.</p>}
        </div>
      </Can>
    </section>
  )
}
