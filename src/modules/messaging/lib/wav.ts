/**
 * Browser recording produces WebM/Opus in Chrome and MP4/AAC in Safari.
 * The helmet plays WAV — every file the backend has received so far is one —
 * so recordings are decoded and re-encoded here before upload rather than
 * sending the device a container it can't open.
 */

/** Voice only, so 16 kHz mono is plenty and keeps files small over a SIM. */
export const TARGET_SAMPLE_RATE = 16_000

function downmix(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0)

  const length = buffer.length
  const mixed = new Float32Array(length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) mixed[i] += data[i] / buffer.numberOfChannels
  }
  return mixed
}

/** Linear interpolation. Fine for speech; not intended for music. */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input

  const ratio = fromRate / toRate
  const length = Math.floor(input.length / ratio)
  const output = new Float32Array(length)

  for (let i = 0; i < length; i += 1) {
    const position = i * ratio
    const lower = Math.floor(position)
    const upper = Math.min(lower + 1, input.length - 1)
    const weight = position - lower
    output[i] = input[lower] * (1 - weight) + input[upper] * weight
  }

  return output
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(bytes)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM header size
  view.setUint16(20, 1, true) // format: PCM
  view.setUint16(22, 1, true) // channels: mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return new Blob([view], { type: 'audio/wav' })
}

/** Whatever the browser recorded → a WAV the helmet can play. */
export async function toWav(recorded: Blob): Promise<Blob> {
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

  const context = new AudioContextClass()
  try {
    const decoded = await context.decodeAudioData(await recorded.arrayBuffer())
    const mono = downmix(decoded)
    const resampled = resample(mono, decoded.sampleRate, TARGET_SAMPLE_RATE)
    return encodeWav(resampled, TARGET_SAMPLE_RATE)
  } finally {
    void context.close()
  }
}

/** A short tone, so mock mode has something that genuinely plays. */
export function toneWav(seconds = 0.6, frequency = 660): Blob {
  const length = Math.floor(TARGET_SAMPLE_RATE * seconds)
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    // Faded at both ends so it doesn't click on play.
    const fade = Math.min(1, Math.min(i, length - i) / (TARGET_SAMPLE_RATE * 0.05))
    samples[i] = Math.sin((2 * Math.PI * frequency * i) / TARGET_SAMPLE_RATE) * 0.3 * fade
  }
  return encodeWav(samples, TARGET_SAMPLE_RATE)
}
