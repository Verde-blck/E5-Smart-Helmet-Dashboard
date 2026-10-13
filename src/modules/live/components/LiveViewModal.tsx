import { useCallback, useState } from 'react'
import type { SessionState } from '../lib/session'
import { Overlay } from './Overlay'
import { StreamVideo } from './StreamVideo'
import { SpeakerIcon } from './icons'

interface Props {
  deviceName: string
  state: SessionState
  onRetry: () => void
  onStartAgain: () => void
  onClose: () => void
  /** Stops the helmet streaming for every viewer, not just this one. */
  onEndForEveryone: () => Promise<void>
}

export function LiveViewModal({
  deviceName,
  state,
  onRetry,
  onStartAgain,
  onClose,
  onEndForEveryone,
}: Props) {
  // Starts muted: browsers only autoplay video without sound. One click to unmute.
  const [muted, setMuted] = useState(true)
  const onBlocked = useCallback(() => setMuted(true), [])
  const live = state.status === 'live'
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  async function endForEveryone() {
    setEnding(true)
    try {
      await onEndForEveryone()
    } finally {
      onClose()
    }
  }

  return (
    <Overlay label={`Live view, ${deviceName}`} onDismiss={onClose}>
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <StatusPill status={state.status} />
            <p className="truncate text-sm font-medium">{deviceName}</p>
          </div>
          <button
            onClick={onClose}
            autoFocus
            className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E2D7]"
          >
            Close
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <StreamVideo
            stream={state.remoteStream}
            muted={muted}
            onAutoplayBlocked={onBlocked}
            className="h-full w-full object-contain"
          />
          {!live && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <StateMessage
                state={state}
                deviceName={deviceName}
                onRetry={onRetry}
                onStartAgain={onStartAgain}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
          {confirmEnd ? (
            <p className="flex flex-wrap items-center gap-2 text-slate-200">
              Stop the helmet streaming for everyone watching it?
              <button
                onClick={() => void endForEveryone()}
                disabled={ending}
                className="rounded-md bg-white px-2.5 py-1 font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-60"
              >
                {ending ? 'Ending…' : 'End stream'}
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                disabled={ending}
                className="rounded-md px-2 py-1 text-slate-300 hover:bg-white/10"
              >
                Keep it running
              </button>
            </p>
          ) : (
            <p>
              Others can watch this helmet at the same time. It stops streaming by itself about
              20 seconds after the last viewer closes.{' '}
              <button
                onClick={() => setConfirmEnd(true)}
                className="text-slate-300 underline underline-offset-2 hover:text-white"
              >
                End stream for everyone
              </button>
            </p>
          )}
          <button
            onClick={() => setMuted((m) => !m)}
            disabled={!live}
            aria-pressed={!muted}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-200 hover:bg-white/10 disabled:opacity-40"
          >
            <SpeakerIcon off={muted} />
            {muted ? 'Turn sound on' : 'Mute'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

export function StatusPill({ status }: { status: SessionState['status'] }) {
  // Teal, not red: red on this dashboard means an alarm.
  if (status === 'live') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#0A6659] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A3E2D7] motion-safe:animate-pulse" />
        Live
      </span>
    )
  }
  const label =
    status === 'reconnecting'
      ? 'Reconnecting'
      : status === 'offline'
        ? 'Offline'
        : status === 'failed'
          ? 'Not connected'
          : 'Connecting'
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300">
      {label}
    </span>
  )
}

export function StateMessage({
  state,
  deviceName,
  onRetry,
  onStartAgain,
}: {
  state: SessionState
  deviceName: string
  onRetry: () => void
  onStartAgain: () => void
}) {
  switch (state.status) {
    case 'requesting-media':
      return <Waiting text="Allow the microphone and camera when the browser asks." />
    case 'starting':
      return <Waiting text={`Contacting ${deviceName}…`} />
    case 'connecting':
      return <Waiting text="Starting the helmet camera. This usually takes 5 to 10 seconds." />
    case 'reconnecting':
      return <Waiting text="Signal dropped. Trying to get the picture back…" />
    case 'offline':
      return (
        <div className="max-w-sm">
          <p className="text-sm font-medium">{deviceName} is offline</p>
          <p className="mt-1 text-sm text-slate-400">
            It didn’t receive the request. Try again once it’s back online.
          </p>
          <button onClick={onStartAgain} className={retryButton}>
            Try again
          </button>
        </div>
      )
    case 'failed':
      return (
        <div className="max-w-sm">
          <p className="text-sm text-slate-200">{state.error}</p>
          <button onClick={onRetry} className={retryButton}>
            Try again
          </button>
        </div>
      )
    default:
      return null
  }
}

const retryButton =
  'mt-4 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E2D7]'

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex max-w-xs flex-col items-center gap-3" aria-live="polite">
      <svg viewBox="0 0 24 24" className="h-7 w-7 animate-spin text-[#A3E2D7]" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  )
}
