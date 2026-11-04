import { useEffect, useState } from 'react'

// Tracks arrive one at a time over WebRTC, so the answer can change after the stream appears.
export function useStreamHasAudio(stream: MediaStream | null): boolean {
  const [hasAudio, setHasAudio] = useState(false)
  useEffect(() => {
    if (!stream) {
      setHasAudio(false)
      return
    }
    const check = () => setHasAudio(stream.getAudioTracks().length > 0)
    check()
    stream.addEventListener('addtrack', check)
    stream.addEventListener('removetrack', check)
    const timer = setInterval(check, 1000)
    return () => {
      stream.removeEventListener('addtrack', check)
      stream.removeEventListener('removetrack', check)
      clearInterval(timer)
    }
  }, [stream])
  return hasAudio
}
