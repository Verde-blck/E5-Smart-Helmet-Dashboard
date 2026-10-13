import { useRef, useState, type MouseEvent } from 'react'
import { Can } from '@/shared/components/Can'
import type { DeviceView } from '@/modules/devices/types'
import { useHelmetSession } from '../hooks/useHelmetSession'
import { CallModal } from './CallModal'
import { LiveViewModal } from './LiveViewModal'
import { PhoneIcon, VideoIcon } from './icons'

type Open = 'watch' | 'call' | null

/**
 * "Watch live" and "Call" for one helmet, with the player and call screens
 * they open.
 *
 * `variant="icons"` is the compact pair for Monitoring Center tiles, which
 * are links: the buttons stop the click there so the tile doesn't navigate.
 */
export function LiveControls({
  device,
  variant = 'buttons',
}: {
  device: Pick<DeviceView, 'id' | 'name' | 'active'>
  variant?: 'buttons' | 'icons'
}) {
  const { session, state, begin, end } = useHelmetSession(device.id)
  const [open, setOpen] = useState<Open>(null)
  const withCamera = useRef(true)

  const disabledReason = !device.active ? 'This helmet is deactivated' : null

  function openWatch(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen('watch')
    begin('watch')
  }

  function openCall(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    // The call screen asks video or voice first; nothing starts until then.
    setOpen('call')
  }

  function close() {
    end()
    setOpen(null)
  }

  const watchLabel = disabledReason ?? `Watch ${device.name} live`
  const callLabel = disabledReason ?? `Call ${device.name}`

  return (
    <Can perm="devices:write">
      {variant === 'icons' ? (
        <>
          <IconButton label={watchLabel} onClick={openWatch} disabled={!!disabledReason}>
            <VideoIcon className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={callLabel} onClick={openCall} disabled={!!disabledReason}>
            <PhoneIcon className="h-3.5 w-3.5" />
          </IconButton>
        </>
      ) : (
        <>
          <TextButton onClick={openWatch} disabled={!!disabledReason} title={disabledReason}>
            <VideoIcon className="h-3.5 w-3.5" /> Watch live
          </TextButton>
          <TextButton onClick={openCall} disabled={!!disabledReason} title={disabledReason}>
            <PhoneIcon className="h-3.5 w-3.5" /> Call
          </TextButton>
        </>
      )}

      {open === 'watch' && state && (
        <LiveViewModal
          deviceName={device.name}
          state={state}
          onRetry={() => session?.retry()}
          onStartAgain={() => begin('watch')}
          onClose={close}
        />
      )}

      {open === 'call' && (
        <CallModal
          deviceName={device.name}
          state={state}
          onStart={(camera) => {
            withCamera.current = camera
            begin('call', { withCamera: camera })
          }}
          onToggleMic={() => session?.toggleMic()}
          onToggleCamera={() => session?.toggleCamera()}
          onRetry={() => session?.retry()}
          onStartAgain={() => begin('call', { withCamera: withCamera.current })}
          onHangUp={close}
        />
      )}
    </Can>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: (e: MouseEvent) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function TextButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: (e: MouseEvent) => void
  disabled?: boolean
  title?: string | null
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? undefined}
      className="flex items-center gap-1.5 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
