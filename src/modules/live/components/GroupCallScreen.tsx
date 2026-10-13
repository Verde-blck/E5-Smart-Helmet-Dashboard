import { useCallback, useEffect, useState } from 'react'
import type { GroupCallState, Participant } from '../lib/groupSession'
import { Overlay } from './Overlay'
import { StreamVideo } from './StreamVideo'
import { CameraIcon, HangUpIcon, MicIcon, SpeakerIcon } from './icons'

interface Props {
  state: GroupCallState
  names: Record<string, string>
  onToggleMic: () => void
  onToggleCamera: () => void
  onRetryHelmet: (deviceId: string) => void
  onHangUp: () => void
}

export function GroupCallScreen({
  state,
  names,
  onToggleMic,
  onToggleCamera,
  onRetryHelmet,
  onHangUp,
}: Props) {
  const [soundBlocked, setSoundBlocked] = useState(false)
  const onBlocked = useCallback(() => setSoundBlocked(true), [])

  const connected = state.participants.filter((p) => p.status === 'live').length
  const hasVideo = !!state.localStream?.getVideoTracks().length
  const setup = state.status === 'requesting-media' || state.status === 'starting'

  return (
    <Overlay label="Group call" onDismiss={onHangUp}>
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-medium">Group call</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
              Beta
            </span>
            {state.status === 'active' && (
              <span className="text-xs text-slate-400">
                {connected} of {state.participants.length} helmets connected
              </span>
            )}
          </div>
          {state.startedAt && <CallTimer since={state.startedAt} />}
        </div>

        {setup || state.status === 'failed' ? (
          <div className="flex min-h-[18rem] items-center justify-center p-6 text-center">
            {state.status === 'failed' ? (
              <div className="max-w-sm">
                <p className="text-sm text-slate-200">{state.error}</p>
                <button
                  onClick={onHangUp}
                  className="mt-4 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-300" aria-live="polite">
                {state.status === 'requesting-media'
                  ? 'Allow the microphone and camera when the browser asks.'
                  : 'Calling the helmets…'}
              </p>
            )}
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-y-auto p-3">
            {soundBlocked && (
              <button
                onClick={(e) => {
                  const grid = e.currentTarget.parentElement
                  grid?.querySelectorAll('video').forEach((v) => void v.play())
                  setSoundBlocked(false)
                }}
                className="sticky top-0 z-10 mx-auto mb-3 block rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-900 shadow"
              >
                Click to hear the helmets
              </button>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {state.participants.map((p) => (
                <HelmetTile
                  key={p.deviceId}
                  participant={p}
                  name={names[p.deviceId] ?? p.deviceId}
                  onRetry={() => onRetryHelmet(p.deviceId)}
                  onAutoplayBlocked={onBlocked}
                />
              ))}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-800">
                {hasVideo && (
                  <StreamVideo
                    stream={state.localStream}
                    muted
                    mirrored
                    className={`h-full w-full object-cover ${state.cameraOn ? '' : 'invisible'}`}
                  />
                )}
                {(!hasVideo || !state.cameraOn) && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                    {state.noCamera ? 'No camera: voice only' : hasVideo ? 'Camera off' : 'Voice only'}
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[11px]">
                  You{state.micOn ? '' : ' (muted)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {state.outgoingFailed && (
          <p role="alert" className="bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
            Your microphone isn’t reaching the call, so the helmets can’t hear you. Hang up and call
            again.
          </p>
        )}

        <div className="flex items-center justify-center gap-3 border-t border-white/5 px-4 py-4">
          <RoundButton
            label={state.micOn ? 'Mute microphone' : 'Unmute microphone'}
            pressed={!state.micOn}
            onClick={onToggleMic}
            disabled={!state.localStream}
          >
            <MicIcon off={!state.micOn} className="h-5 w-5" />
          </RoundButton>
          {hasVideo && (
            <RoundButton
              label={state.cameraOn ? 'Turn camera off' : 'Turn camera on'}
              pressed={!state.cameraOn}
              onClick={onToggleCamera}
            >
              <CameraIcon off={!state.cameraOn} className="h-5 w-5" />
            </RoundButton>
          )}
          <button
            onClick={onHangUp}
            aria-label="Hang up for everyone"
            title="Hang up for everyone"
            className="flex h-12 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <HangUpIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function HelmetTile({
  participant,
  name,
  onRetry,
  onAutoplayBlocked,
}: {
  participant: Participant
  name: string
  onRetry: () => void
  onAutoplayBlocked: () => void
}) {
  // Everyone's audible by default, as on a call; any one can be muted.
  const [muted, setMuted] = useState(false)
  const live = participant.status === 'live'

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      <StreamVideo
        stream={participant.stream}
        muted={muted}
        onAutoplayBlocked={onAutoplayBlocked}
        className="h-full w-full object-cover"
      />
      {!live && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-slate-300">
          {participant.status === 'unreachable' ? (
            <span>Offline: not reachable</span>
          ) : participant.status === 'failed' ? (
            <span>
              No picture.{' '}
              <button onClick={onRetry} className="underline underline-offset-2 hover:text-white">
                Try again
              </button>
            </span>
          ) : participant.status === 'reconnecting' ? (
            <span>Signal dropped, reconnecting…</span>
          ) : (
            <span>Connecting…</span>
          )}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-2 pb-3 pt-1.5">
        <span className="truncate text-xs font-medium">{name}</span>
        {live && (
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? `Unmute ${name}` : `Mute ${name}`}
            aria-pressed={muted}
            className="flex h-6 w-6 items-center justify-center rounded bg-black/40 hover:bg-black/60"
          >
            <SpeakerIcon off={muted} className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function RoundButton({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      className={`flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E2D7] disabled:opacity-40 ${
        pressed ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

function CallTimer({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((now - since) / 1000))
  return (
    <span className="font-mono text-sm tabular-nums text-slate-300">
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </span>
  )
}
