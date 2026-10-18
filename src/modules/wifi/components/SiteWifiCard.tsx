import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Can } from '@/shared/components/Can'
import { useTenantId } from '@/shared/hooks/useTenant'
import { fetchSiteWifi, removeSiteWifi, saveSiteWifi } from '../api/wifi.api'

/**
 * The site's Wi-Fi, given to every helmet in its start-up settings and saved
 * as a known network, so helmets join it by themselves. The password is
 * write-only: the backend never sends it back.
 */
export function SiteWifiCard() {
  const tenantId = useTenantId()
  const queryClient = useQueryClient()
  const key = ['tenant', tenantId, 'site-wifi']
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: fetchSiteWifi })
  const [editing, setEditing] = useState(false)
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setSsid(data?.ssid ?? '')
      setPassword('')
      setError(null)
    }
  }, [editing, data?.ssid])

  async function save() {
    if (!ssid.trim()) return setError('Enter the network name.')
    if (!data?.passwordSet && !password) return setError('Enter the password.')
    setBusy(true)
    try {
      const saved = await saveSiteWifi(ssid.trim(), password || undefined)
      queryClient.setQueryData(key, saved)
      setEditing(false)
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await removeSiteWifi()
      queryClient.setQueryData(key, { ssid: null, passwordSet: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Site Wi-Fi</h2>
          <p className="mt-1 text-xs text-slate-500">
            Every helmet receives this network when it starts up and joins it by itself whenever it’s
            in range.
          </p>
        </div>
        {!editing && (
          <Can perm="wifi:write">
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {data?.ssid ? 'Change' : 'Set site Wi-Fi'}
              </button>
              {data?.ssid && (
                <button onClick={() => void remove()} disabled={busy} className="text-xs text-slate-500 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
          </Can>
        )}
      </div>

      {!editing && (
        <p className="mt-2 text-sm text-slate-700">
          {isLoading ? (
            <span className="text-slate-400">Loading…</span>
          ) : isError ? (
            <span className="text-red-600">Couldn’t load the site Wi-Fi.</span>
          ) : data?.ssid ? (
            <>
              <span className="font-medium">{data.ssid}</span>
              <span className="text-slate-400"> · {data.passwordSet ? 'password saved' : 'no password'}</span>
            </>
          ) : (
            <span className="text-slate-400">Not set</span>
          )}
        </p>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs text-slate-600">
            <span className="mb-1 block font-medium">Network name</span>
            <input
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              spellCheck={false}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={data?.passwordSet ? 'Leave empty to keep the current one' : ''}
              className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="rounded bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-slate-400 sm:col-span-3">
            Helmets pick up a change the next time they restart.
          </p>
          {error && <p className="text-xs text-red-600 sm:col-span-3">{error}</p>}
        </div>
      )}
    </section>
  )
}
