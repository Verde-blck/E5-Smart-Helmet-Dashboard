import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  muted: boolean
  mirrored?: boolean
  className?: string
  // The browser refused sound until the user interacts.
  onAutoplayBlocked?: () => void
}

// srcObject must be set on the element directly; React has no prop for it. playsInline stops
// iPhones going fullscreen.
export function StreamVideo({ stream, muted, mirrored, className = '', onAutoplayBlocked }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream
    if (!stream) return
    el.play().catch((error: DOMException) => {
      if (error?.name === 'NotAllowedError') onAutoplayBlocked?.()
    })
  }, [stream, muted, onAutoplayBlocked])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${mirrored ? '-scale-x-100' : ''} ${className}`}
    />
  )
}
