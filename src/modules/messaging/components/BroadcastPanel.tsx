import { useEffect, useRef, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { useMessages, useSendVoiceMessage } from '../hooks/useMessages'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import type { VoiceMessage } from '../types'

function Bubble({
  message,
  onMissing,
}: {
  message: VoiceMessage
  onMissing: () => void
}) {
  const outbound = message.direction === 'TO_HELMET'
  const [missing, setMissing] = useState(false)

  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <p
          className={`mb-1 text-[11px] text-slate-400 ${outbound ? 'text-right' : 'text-left'}`}
        >
          {outbound ? 'Sent to helmet' : 'From the wearer'} ·{' '}
          {new Date(message.createdAt).toLocaleString()}
        </p>
        <div
          className={`rounded-lg px-2 py-1.5 ${
            outbound ? 'bg-brand-primary/10' : 'bg-slate-100'
          }`}
        >
          {!message.audioUrl || missing ? (
            // The message record outlives its audio file: the backend stores
            // uploads on the server's own disk, which is wiped whenever the
            // host restarts. Saying so beats a player stuck at 0:00.
            <span className="block text-xs text-slate-500">
              Recording no longer available on the server
            </span>
          ) : (
            <audio
              controls
              preload="none"
              src={message.audioUrl}
              onError={() => {
                setMissing(true)
                onMissing()
              }}
              className="h-8 w-64 max-w-full"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function BroadcastPanel({
  deviceId,
  deviceName,
  onClose,
}: {
  deviceId: string
  deviceName: string
  onClose: () => void
}) {
  const { messages, isLoading } = useMessages(deviceId)
  const send = useSendVoiceMessage(deviceId)
  const recorder = useVoiceRecorder()
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [missingCount, setMissingCount] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // A recorded clip lives in a blob URL; revoke it when it's replaced or the
  // panel closes, or the memory is held for the life of the tab.
  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.url)
  }, [pending])

  function stage(blob: Blob) {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending({ blob, url: URL.createObjectURL(blob) })
  }

  async function finishRecording() {
    const wav = await recorder.stop()
    if (wav) stage(wav)
  }

  function submit() {
    if (!pending) return
    send.mutate(pending.blob, {
      onSuccess: (result) => {
        URL.revokeObjectURL(pending.url)
        setPending(null)
        setNote(
          result.delivered
            ? 'Delivered to the helmet.'
            : // Not a failure: the backend queues it until the helmet reconnects.
              'Queued — the helmet will play it when it next connects.'
        )
      },
      onError: () => setNote('Could not send that message. Try again.'),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Broadcast</p>
            <p className="text-xs text-slate-500">{deviceName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-3">
          {isLoading && <p className="text-sm text-slate-500">Loading conversation…</p>}
          {!isLoading && messages.length === 0 && (
            <p className="text-sm text-slate-500">
              No messages yet. Record one below and the helmet will play it aloud.
            </p>
          )}
          {messages.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              onMissing={() => setMissingCount((n) => n + 1)}
            />
          ))}
          <div ref={endRef} />

          {missingCount > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {missingCount} older {missingCount === 1 ? 'recording is' : 'recordings are'}{' '}
              no longer on the server. Audio is currently kept on the host's own
              disk, which is cleared when it restarts — permanent storage is
              still to be set up.
            </p>
          )}
        </div>

        <Can perm="devices:write">
          <div className="border-t border-slate-200 px-4 py-3">
            <p className="mb-1 text-xs text-slate-500">
              {/* Voice only, by design. The helmet plays an audio file; it has
                  no speech synthesis, so there is nothing to type into. */}
              Record a message and the helmet will play it aloud to the wearer.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {recorder.state === 'recording' ? (
                <>
                  <button
                    onClick={finishRecording}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Stop {Math.floor(recorder.elapsedMs / 1000)}s
                  </button>
                  <button
                    onClick={recorder.cancel}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    Discard
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void recorder.start()}
                  disabled={recorder.state === 'requesting' || recorder.state === 'converting'}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {recorder.state === 'requesting'
                    ? 'Allow microphone…'
                    : recorder.state === 'converting'
                      ? 'Processing…'
                      : 'Record voice'}
                </button>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Upload audio
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) stage(file)
                  e.target.value = ''
                }}
              />
            </div>

            {recorder.error && (
              <p className="mt-2 text-xs text-red-600">{recorder.error}</p>
            )}

            {pending && (
              <div className="mt-3 rounded-md border border-slate-200 p-2">
                <p className="mb-1 text-[11px] text-slate-500">Ready to send — listen first:</p>
                <audio controls src={pending.url} className="h-8 w-full" />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={submit}
                    disabled={send.isPending}
                    className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                  >
                    {send.isPending ? 'Sending…' : 'Send to helmet'}
                  </button>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(pending.url)
                      setPending(null)
                    }}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {note && <p className="mt-2 text-xs text-slate-600">{note}</p>}
          </div>
        </Can>
      </div>
    </div>
  )
}
