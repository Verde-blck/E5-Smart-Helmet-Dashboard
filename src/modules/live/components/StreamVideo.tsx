import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  muted: boolean
  /** Self-view only: mirrored, like looking in a mirror. */
  mirrored?: boolean
  className?: string
  /** The browser refused to play with sound until the user interacts. */
  onAutoplayBlocked?: () => void
}

/**
 * A <video> fed from a MediaStream rather than a URL.
 *
 * srcObject has to be set on the element directly; React has no prop for it.
 * playsInline stops iPhones jumping to fullscreen.
 */
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
