import { useCallback, useRef, useState } from 'react'
import { toWav } from '../lib/wav'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'converting' | 'error'

// Order of preference. Chrome gives WebM/Opus, Safari MP4/AAC; both are
// decoded and re-encoded to WAV afterwards, so either is fine here.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    // Releasing the tracks is what turns off the browser's recording
    // indicator; without it the tab looks like it's still listening.
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setElapsedMs(0)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio.')
      setState('error')
      return
    }

    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      recorderRef.current = recorder

      const startedAt = Date.now()
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 200)
      setState('recording')
    } catch {
      // Almost always a denied microphone permission rather than a fault.
      setError('Microphone access was blocked. Allow it in the browser and try again.')
      setState('error')
      cleanup()
    }
  }, [cleanup])

  /** Stops and returns a WAV blob, or null if nothing was captured. */
  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      cleanup()
      setState('idle')
      return null
    }

    setState('converting')

    const recorded = await new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      recorder.stop()
    })

    cleanup()

    try {
      const wav = await toWav(recorded)
      setState('idle')
      return wav
    } catch {
      setError('Could not process the recording.')
      setState('error')
      return null
    }
  }, [cleanup])

  const cancel = useCallback(() => {
    recorderRef.current?.stop()
    cleanup()
    setState('idle')
    setElapsedMs(0)
  }, [cleanup])

  return { state, error, elapsedMs, start, stop, cancel }
}
