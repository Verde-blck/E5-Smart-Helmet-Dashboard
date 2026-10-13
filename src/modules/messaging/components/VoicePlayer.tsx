import { useEffect, useRef, useState } from 'react'
import type BenzAMRRecorder from 'benz-amr-recorder'

/**
 * Plays a voice message.
 *
 * Helmets record AMR, which no browser plays natively, so clips from a
 * helmet go through a small AMR decoder (benz-amr-recorder), loaded only
 * when one is first played. Everything else is an ordinary <audio>.
 */
export function VoicePlayer({
  url,
  amr,
  onMissing,
}: {
  url: string
  /** The clip is AMR (from a helmet). */
  amr: boolean
  /** The file couldn't be loaded. */
  onMissing: () => void
}) {
  if (!amr) {
    return (
      <audio controls preload="none" src={url} onError={onMissing} className="h-8 w-64 max-w-full" />
    )
  }
  return <AmrPlayer url={url} onMissing={onMissing} />
}

/** AMR if the link's file name says so; signed links carry a query string. */
export function looksLikeAmr(url: string): boolean {
  try {
    return new URL(url, window.location.href).pathname.toLowerCase().endsWith('.amr')
  } catch {
    return /\.amr(\?|$)/i.test(url)
  }
}

type AmrState = 'idle' | 'loading' | 'playing' | 'paused'

function AmrPlayer({ url, onMissing }: { url: string; onMissing: () => void }) {
  const [state, setState] = useState<AmrState>('idle')
  const [duration, setDuration] = useState<number | null>(null)
  const player = useRef<BenzAMRRecorder | null>(null)

  // Stop and free the decoder when the bubble goes away.
  useEffect(
    () => () => {
      player.current?.destroy()
      player.current = null
    },
    []
  )

  async function toggle() {
    const amr = player.current
    if (amr && state === 'playing') {
      amr.pause()
      setState('paused')
      return
    }
    if (amr && state === 'paused') {
      amr.resume()
      setState('playing')
      return
    }

    setState('loading')
    try {
      // Fetched here rather than by the decoder, so a dead link is caught.
      // The link is signed and expires in an hour, so it's never cached.
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const { default: Decoder } = await import('benz-amr-recorder')
      const next = new Decoder()
      await next.initWithBlob(blob)
      next.onEnded(() => setState('idle'))
      player.current?.destroy()
      player.current = next
      setDuration(next.getDuration())
      next.play()
      setState('playing')
    } catch {
      setState('idle')
      onMissing()
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={state === 'loading'}
        aria-label={state === 'playing' ? 'Pause' : 'Play'}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-brand-primary disabled:opacity-50"
      >
        {state === 'playing' ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <span className="text-xs text-slate-500">
        {state === 'loading'
          ? 'Loading…'
          : duration != null
            ? `${Math.round(duration)}s voice clip`
            : 'Voice clip from the helmet'}
      </span>
    </span>
  )
}
