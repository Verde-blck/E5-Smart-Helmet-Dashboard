import { useState } from 'react'
import { useHelmetSession } from '../hooks/useHelmetSession'
import { CallModal } from './CallModal'
import { PhoneIcon } from './icons'

/**
 * For manual_sos_button alarms. Holding SOS puts the helmet straight into a
 * video call room and it starts sending video, so the control room only has
 * to join: the normal one-to-one call, started immediately with no "video or
 * voice?" step, because seconds matter here.
 *
 * Hanging up sends webrtc-call/stop. Until then the helmet keeps streaming;
 * the server doesn't stop a helmet that's in a call.
 */
export function SosCallButton({
  deviceId,
  deviceName,
  className = '',
}: {
  deviceId: string
  deviceName: string
  className?: string
}) {
  const { session, state, begin, end } = useHelmetSession(deviceId)
  const [open, setOpen] = useState(false)

  function join(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
    begin('call', { withCamera: true })
  }

  // No permission check: anyone signed in can answer an open SOS, so
  // whoever is at the screen can respond. The backend allows it for helmets
  // with an SOS from the last 30 minutes.
  return (
    <>
      <button
        type="button"
        onClick={join}
        className={`inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 ${className}`}
      >
        <PhoneIcon className="h-4 w-4" />
        Join SOS call
      </button>

      {open && (
        <CallModal
          deviceName={`SOS · ${deviceName}`}
          state={state}
          onStart={(camera) => begin('call', { withCamera: camera })}
          onToggleMic={() => session?.toggleMic()}
          onToggleCamera={() => session?.toggleCamera()}
          onRetry={() => session?.retry()}
          onStartAgain={() => begin('call', { withCamera: true })}
          onHangUp={() => {
            end()
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
