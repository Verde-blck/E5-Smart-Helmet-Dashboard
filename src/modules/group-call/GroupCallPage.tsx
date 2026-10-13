import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Can } from '@/shared/components/Can'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useCreateGroup, useGroups } from '@/modules/users/hooks/useAdmins'
import { useVoiceRecorder } from '@/modules/messaging/hooks/useVoiceRecorder'
import { useGroupCall } from '@/modules/live/hooks/useGroupCall'
import { GroupCallScreen } from '@/modules/live/components/GroupCallScreen'
import {
  GROUP_CALL_MAX,
  activeGroupCall,
  getGroupCall,
  stopGroupCall,
} from '@/modules/live/api/groupCall.api'
import { PhoneIcon, VideoIcon } from '@/modules/live/components/icons'
import { useGroupBroadcast } from './hooks/useGroupBroadcast'

type Mode = 'call' | 'message'

export function GroupCallPage() {
  const { groups, isLoading: groupsLoading } = useGroups()
  const { devices } = useDevices()
  const createGroup = useCreateGroup()
  const recorder = useVoiceRecorder()
  const { broadcast, sending, results, clear } = useGroupBroadcast()
  const call = useGroupCall()

  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [naming, setNaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [roster, setRoster] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('call')
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null)

  const matchingGroups = useMemo(() => {
    const needle = groupSearch.trim().toLowerCase()
    return needle ? groups.filter((g) => g.name.toLowerCase().includes(needle)) : groups
  }, [groups, groupSearch])

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null
  const targets = devices.filter((d) => roster.includes(d.id))
  const reachable = targets.filter((d) => d.active)
  const names = useMemo(() => Object.fromEntries(devices.map((d) => [d.id, d.name])), [devices])

  const overCallLimit = reachable.length > GROUP_CALL_MAX

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
    ).then((ok) => {
      if (!ok) return
      URL.revokeObjectURL(pending.url)
      setPending(null)
    })
  }

  return (
    <div>
      <LeftoverCall
        onRejoin={(callId, withCamera) => call.rejoin(callId, withCamera)}
        inCall={!!call.state}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside>
          <div className="mb-2 flex gap-2">
            <input
              type="search"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups"
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
              {matchingGroups.map((group) => (
                <li key={group.id}>
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    aria-pressed={group.id === selectedGroupId}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      group.id === selectedGroupId ? 'bg-brand-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="block truncate font-medium text-slate-800">{group.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      Created by {group.createdBy ?? '—'}
                    </span>
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
              <div
                className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-sm"
                role="group"
                aria-label="Call or message"
              >
                {(
                  [
                    ['call', 'Live call'],
                    ['message', 'Voice message'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={`flex items-center gap-1.5 rounded px-3 py-1.5 ${
                      mode === value
                        ? 'bg-brand-primary/10 font-medium text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                    {value === 'call' && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] font-normal text-slate-500">
                        Beta
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-slate-800">{selectedGroup.name}</h2>
                  <span
                    className={`text-xs ${
                      mode === 'call' && overCallLimit ? 'font-medium text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    {roster.length} selected
                    {mode === 'call' && ` · up to ${GROUP_CALL_MAX} per call`}
                  </span>
                </div>
                <p className="mb-3 text-[11px] text-slate-400">
                  {/* Groups hold administrators, not helmets (the API has no
                      device membership), so the helmets are chosen here. */}
                  Choose which helmets to include. Group membership covers administrators only, so
                  helmets are picked each time.
                </p>

                <div className="mb-2 flex gap-3 text-xs">
                  <button
                    onClick={() => setRoster(devices.map((d) => d.id))}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Select all
                  </button>
                  <button onClick={() => setRoster([])} className="text-slate-500 hover:text-slate-800">
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
                      <span className="font-mono text-[11px] text-slate-400">{device.id.slice(-6)}</span>
                      {!device.active && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          Inactive
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {mode === 'call'
                    ? 'Offline helmets can’t join a call; they show as not reachable. Deactivated ones are skipped.'
                    : 'Offline helmets still receive the message; it plays when they reconnect. Deactivated ones are skipped.'}
                </p>
              </div>

              <Can perm="devices:write">
                {mode === 'call' ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-700">
                      Talk live with the selected helmets. You’ll see and hear each one.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Beta: group calls haven’t been tested on several real helmets yet.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => call.start(reachable.map((d) => d.id), true)}
                        disabled={reachable.length === 0 || overCallLimit || !!call.state}
                        className="inline-flex items-center gap-1.5 rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                      >
                        <VideoIcon /> Start video call
                      </button>
                      <button
                        onClick={() => call.start(reachable.map((d) => d.id), false)}
                        disabled={reachable.length === 0 || overCallLimit || !!call.state}
                        className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <PhoneIcon /> Voice only
                      </button>
                      {reachable.length === 0 && (
                        <span className="text-xs text-amber-700">Select at least one active helmet.</span>
                      )}
                      {overCallLimit && (
                        <span className="text-xs text-amber-700">
                          A call can include up to {GROUP_CALL_MAX} helmets. Deselect{' '}
                          {reachable.length - GROUP_CALL_MAX}.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-sm text-slate-700">
                      Record a message and every selected helmet plays it aloud.
                    </p>

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
                          disabled={recorder.state === 'requesting' || recorder.state === 'converting'}
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

                    {recorder.error && <p className="mt-2 text-xs text-red-600">{recorder.error}</p>}

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
                            <span className="text-xs text-amber-700">Select at least one active helmet.</span>
                          )}
                        </div>
                      </div>
                    )}

                    {results && (
                      <ul className="mt-3 space-y-1">
                        {results.map((r) => (
                          <li
                            key={r.deviceId}
                            className={`text-xs ${
                              r.status === 'sent'
                                ? 'text-emerald-700'
                                : r.status === 'queued'
                                  ? 'text-slate-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {r.deviceName}:{' '}
                            {r.status === 'sent'
                              ? 'played'
                              : r.status === 'queued'
                                ? 'offline, will play when it reconnects'
                                : 'not sent'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Can>
            </div>
          )}
        </section>
      </div>

      {call.state && (
        <GroupCallScreen
          state={call.state}
          names={names}
          onToggleMic={() => call.session?.toggleMic()}
          onToggleCamera={() => call.session?.toggleCamera()}
          onRetryHelmet={(id) => call.session?.retryHelmet(id)}
          onHangUp={call.hangUp}
        />
      )}
    </div>
  )
}

/**
 * A call this tab started and didn't hang up, typically after a reload. The
 * helmets are still in call mode, so offer to rejoin it or end it for
 * everyone rather than leave them hanging.
 */
function LeftoverCall({
  onRejoin,
  inCall,
}: {
  onRejoin: (callId: string, withCamera: boolean) => void
  inCall: boolean
}) {
  const [callId, setCallId] = useState(() => activeGroupCall.get())
  const { data } = useQuery({
    queryKey: ['group-call', callId],
    queryFn: () => getGroupCall(callId as string),
    enabled: !!callId && !inCall,
    retry: false,
  })

  // Already over (e.g. the backend restarted): forget it quietly.
  useEffect(() => {
    if (data === null) activeGroupCall.set(null)
  }, [data])

  if (!callId || inCall || !data) return null

  const forget = () => {
    activeGroupCall.set(null)
    setCallId(null)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="min-w-0 flex-1">
        A group call you started is still running on {data.helmets.length}{' '}
        {data.helmets.length === 1 ? 'helmet' : 'helmets'}.
      </span>
      <button
        onClick={() => {
          setCallId(null)
          onRejoin(data.callId, true)
        }}
        className="rounded bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
      >
        Rejoin
      </button>
      <button
        onClick={() => {
          void stopGroupCall(data.callId)
          forget()
        }}
        className="rounded border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-900 hover:bg-amber-100"
      >
        End it for everyone
      </button>
    </div>
  )
}
