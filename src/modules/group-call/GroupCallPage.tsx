import { useMemo, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useCreateGroup, useGroups } from '@/modules/users/hooks/useAdmins'
import { useVoiceRecorder } from '@/modules/messaging/hooks/useVoiceRecorder'
import { useGroupBroadcast } from './hooks/useGroupBroadcast'

export function GroupCallPage() {
  const { groups, isLoading: groupsLoading } = useGroups()
  const { devices, now } = useDevices()
  const createGroup = useCreateGroup()
  const recorder = useVoiceRecorder()
  const { broadcast, sending, results, clear } = useGroupBroadcast()

  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [naming, setNaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [roster, setRoster] = useState<string[]>([])
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null)

  const matchingGroups = useMemo(() => {
    const needle = groupSearch.trim().toLowerCase()
    return needle ? groups.filter((g) => g.name.toLowerCase().includes(needle)) : groups
  }, [groups, groupSearch])

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null
  const targets = devices.filter((d) => roster.includes(d.id))
  const reachable = targets.filter((d) => d.active)

  function stage(blob: Blob) {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending({ blob, url: URL.createObjectURL(blob) })
    clear()
  }

  async function finishRecording() {
    const wav = await recorder.stop()
    if (wav) stage(wav)
  }

  function send() {
    if (!pending || reachable.length === 0) return
    void broadcast(
      reachable.map((d) => ({ id: d.id, name: d.name })),
      pending.blob
    ).then(() => {
      URL.revokeObjectURL(pending.url)
      setPending(null)
    })
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Group Call</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside>
          <div className="mb-2 flex gap-2">
            <input
              type="search"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Enter group name"
              className="min-w-0 flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
            <Can perm="users:write">
              <button
                onClick={() => {
                  setNaming(true)
                  setDraftName('')
                }}
                className="shrink-0 rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
              >
                Create
              </button>
            </Can>
          </div>

          {naming && (
            <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Group name"
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                disabled={!draftName.trim() || createGroup.isPending}
                onClick={() =>
                  createGroup.mutate(draftName.trim(), { onSuccess: () => setNaming(false) })
                }
                className="rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button onClick={() => setNaming(false)} className="text-xs text-slate-500">
                Cancel
              </button>
            </div>
          )}

          {groupsLoading ? (
            <p className="text-sm text-slate-500">Loading groups…</p>
          ) : matchingGroups.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
              No groups yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {matchingGroups.map((group, index) => (
                <li key={group.id}>
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                      group.id === selectedGroupId ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {group.name}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {group.createdBy ?? '—'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{index}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section>
          {!selectedGroup ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Select a group to start.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-slate-800">{selectedGroup.name}</h2>
                  <span className="text-xs text-slate-500">
                    {roster.length} of {devices.length} selected
                  </span>
                </div>
                <p className="mb-3 text-[11px] text-slate-400">
                  {/* Groups hold administrators, not helmets — the API has no
                      device membership — so the call roster is chosen here. */}
                  Choose which helmets to include. Group membership covers
                  administrators only, so helmets are picked per call.
                </p>

                <div className="mb-2 flex gap-3 text-xs">
                  <button
                    onClick={() => setRoster(devices.map((d) => d.id))}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setRoster([])}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-200">
                  {devices.map((device) => (
                    <label
                      key={device.id}
                      className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={roster.includes(device.id)}
                        onChange={() =>
                          setRoster((prev) =>
                            prev.includes(device.id)
                              ? prev.filter((id) => id !== device.id)
                              : [...prev, device.id]
                          )
                        }
                        className="h-3.5 w-3.5 accent-brand-primary"
                      />
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          device.presence === 'online'
                            ? 'bg-emerald-500'
                            : device.presence === 'degraded'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                        {device.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {device.id.slice(-6)}
                      </span>
                      {!device.active && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          Inactive
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Offline helmets still receive the message — it plays when they
                  reconnect. Deactivated ones are skipped.
                </p>
              </div>

              <Can perm="devices:write">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Message
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    {recorder.state === 'recording' ? (
                      <>
                        <button
                          onClick={finishRecording}
                          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                        >
                          Stop {Math.floor(recorder.elapsedMs / 1000)}s
                        </button>
                        <button
                          onClick={recorder.cancel}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          Discard
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => void recorder.start()}
                        disabled={
                          recorder.state === 'requesting' || recorder.state === 'converting'
                        }
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {recorder.state === 'requesting'
                          ? 'Allow microphone…'
                          : recorder.state === 'converting'
                            ? 'Processing…'
                            : 'Record message'}
                      </button>
                    )}
                  </div>

                  {recorder.error && (
                    <p className="mt-2 text-xs text-red-600">{recorder.error}</p>
                  )}

                  {pending && (
                    <div className="mt-3 rounded-md border border-slate-200 p-2">
                      <p className="mb-1 text-[11px] text-slate-500">
                        Listen before sending to {reachable.length}{' '}
                        {reachable.length === 1 ? 'helmet' : 'helmets'}:
                      </p>
                      <audio controls src={pending.url} className="h-8 w-full" />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={send}
                          disabled={sending || reachable.length === 0}
                          className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                        >
                          {sending ? 'Sending…' : `Send to ${reachable.length}`}
                        </button>
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(pending.url)
                            setPending(null)
                          }}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          Discard
                        </button>
                        {reachable.length === 0 && (
                          <span className="text-xs text-amber-700">
                            Select at least one active helmet.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {results && (
                    <div className="mt-3 space-y-1">
                      {/* Per-helmet outcome: a partial failure has to be
                          visible, not averaged into one success message. */}
                      {results.map((r) => (
                        <p
                          key={r.deviceId}
                          className={`text-xs ${r.ok ? 'text-emerald-700' : 'text-red-600'}`}
                        >
                          {r.deviceName} — {r.ok ? 'sent' : 'failed'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Can>
            </div>
          )}
        </section>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Live push-to-talk needs an audio channel the backend does not expose
        yet. Until it does, a group call is delivered as a recorded message to
        each helmet. Last refreshed {new Date(now).toLocaleTimeString()}.
      </p>
    </div>
  )
}
