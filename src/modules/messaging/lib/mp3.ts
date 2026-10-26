import { downmix, resample } from './wav'

// MPEG-1 Layer III, mono 44.1 kHz at 64 kbit/s: the most widely supported MP3, about 0.5 MB a
// minute.
export const MP3_SAMPLE_RATE = 44_100
const KBPS = 64
// LAME's frame size; whole frames avoid an internal copy.
const FRAME = 1152

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

export async function encodeMp3(samples: Float32Array): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const encoder = new Mp3Encoder(1, MP3_SAMPLE_RATE, KBPS)
  const pcm = toInt16(samples)
  const parts: Uint8Array[] = []
  for (let i = 0; i < pcm.length; i += FRAME) {
    const chunk = encoder.encodeBuffer(pcm.subarray(i, i + FRAME))
    if (chunk.length) parts.push(chunk)
  }
  const tail = encoder.flush()
  if (tail.length) parts.push(tail)
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' })
}

export async function toMp3(recorded: Blob): Promise<Blob> {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const context = new AudioContextClass()
  try {
    const decoded = await context.decodeAudioData(await recorded.arrayBuffer())
    const mono = downmix(decoded)
    return encodeMp3(resample(mono, decoded.sampleRate, MP3_SAMPLE_RATE))
  } finally {
    void context.close()
  }
}
