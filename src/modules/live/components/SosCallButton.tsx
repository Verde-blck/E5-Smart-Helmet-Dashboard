import { useState } from 'react'
import { useHelmetSession } from '../hooks/useHelmetSession'
import { CallModal } from './CallModal'
import { PhoneIcon } from './icons'

// Joins immediately with no video-or-voice step: seconds matter.
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
