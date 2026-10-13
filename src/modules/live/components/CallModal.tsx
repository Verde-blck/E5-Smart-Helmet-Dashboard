import { useCallback, useEffect, useState } from 'react'
import type { SessionState } from '../lib/session'
import { Overlay } from './Overlay'
import { StatusPill, StateMessage } from './LiveViewModal'
import { StreamVideo } from './StreamVideo'
import { CameraIcon, HangUpIcon, MicIcon, PhoneIcon, VideoIcon } from './icons'

interface Props {
  deviceName: string
  /** null until the operator picks video or voice. */
  state: SessionState | null
  onStart: (withCamera: boolean) => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onRetry: () => void
  /** After "offline": call again with the same choice of video or voice. */
  onStartAgain: () => void
  onHangUp: () => void
}

export function CallModal({
  deviceName,
  state,
  onStart,
  onToggleMic,
  onToggleCamera,
  onRetry,
  onStartAgain,
  onHangUp,
}: Props) {
  return (
    <Overlay label={`Call ${deviceName}`} onDismiss={onHangUp}>
      {state ? (
        <InCall
          deviceName={deviceName}
          state={state}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onRetry={onRetry}
          onStartAgain={onStartAgain}
          onHangUp={onHangUp}
        />
      ) : (
        <ChooseCall deviceName={deviceName} onStart={onStart} onCancel={onHangUp} />
      )}
    </Overlay>
  )
}

/**
 * An explicit choice before anything happens, because starting a call puts
 * the helmet into call mode and switches on this computer's camera.
 */
function ChooseCall({
  deviceName,
  onStart,
  onCancel,
}: {
  deviceName: string
  onStart: (withCamera: boolean) => void
  onCancel: () => void
}) {
  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-6 text-slate-800 shadow-2xl">
      <h2 className="text-lg">Call {deviceName}</h2>
      <p className="mt-1 text-sm text-slate-600">
        You’ll see and hear the helmet’s wearer, and they’ll hear you. With a video call they
        also see you.
      </p>
      <div className="mt-5 grid gap-2">
        <button
          onClick={() => onStart(true)}
          autoFocus
          className="flex items-center justify-center gap-2 rounded-md bg-brand-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2"
        >
          <VideoIcon /> Video call
        </button>
        <button
          onClick={() => onStart(false)}
          className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
        >
          <PhoneIcon /> Voice only
        </button>
        <button onClick={onCancel} className="mt-1 text-sm text-slate-500 hover:text-slate-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

function InCall({
  deviceName,
  state,
  onToggleMic,
  onToggleCamera,
  onRetry,
  onStartAgain,
  onHangUp,
}: {
  deviceName: string
  state: SessionState
  onToggleMic: () => void
  onToggleCamera: () => void
  onRetry: () => void
  onStartAgain: () => void
  onHangUp: () => void
}) {
  const [soundBlocked, setSoundBlocked] = useState(false)
  const onBlocked = useCallback(() => setSoundBlocked(true), [])
  const live = state.status === 'live'
  const hasVideo = !!state.localStream?.getVideoTracks().length

  return (
    <div className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-slate-900 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusPill status={state.status} />
          <p className="truncate text-sm font-medium">{deviceName}</p>
        </div>
        {state.liveSince && <CallTimer since={state.liveSince} />}
      </div>

      <div className="relative aspect-video bg-black">
        {/* Not muted: this is a conversation. If the browser blocks sound,
            the button below asks for the one click it needs. */}
        <StreamVideo
          stream={state.remoteStream}
          muted={false}
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

        {hasVideo && (
          <div className="absolute bottom-3 right-3 w-28 overflow-hidden rounded-lg border border-white/20 bg-slate-800 shadow-lg sm:w-40">
            <StreamVideo
              stream={state.localStream}
              muted
              mirrored
              className={`aspect-[4/3] w-full object-cover ${state.cameraOn ? '' : 'invisible'}`}
            />
            {!state.cameraOn && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400">
                Camera off
              </span>
            )}
          </div>
        )}

        {soundBlocked && live && (
          <button
            onClick={(e) => {
              const video = e.currentTarget.parentElement?.querySelector('video')
              void video?.play().then(() => setSoundBlocked(false))
            }}
            className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-900 shadow"
          >
            Click to hear the helmet
          </button>
        )}
      </div>

      {state.outgoingFailed && (
        <p role="alert" className="bg-amber-500/15 px-4 py-2 text-xs text-amber-200">
          Your microphone{hasVideo ? ' and camera' : ''} aren’t reaching the helmet, so the wearer
          can’t hear you. Hang up and call again.
        </p>
      )}
      {state.noCamera && (
        <p className="bg-white/5 px-4 py-2 text-xs text-slate-300">
          No camera was found on this computer, so this is a voice call.
        </p>
      )}

      <div className="flex items-center justify-center gap-3 px-4 py-4">
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
          aria-label="Hang up"
          className="flex h-12 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <HangUpIcon className="h-6 w-6" />
        </button>
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
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return <span className="font-mono text-sm tabular-nums text-slate-300">{mm}:{ss}</span>
}
