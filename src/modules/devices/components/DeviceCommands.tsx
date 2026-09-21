import { Can } from '@/shared/components/Can'
import { COMMAND_LABELS } from '../api/commands.api'
import type { DeviceCommand } from '../api/commands.api'
import { useDeviceCommands } from '../hooks/useDeviceCommands'
import type { DeviceView } from '../types'

const ORDER: DeviceCommand[] = [
  'take-photo',
  'start-recording',
  'stop-recording',
  'flashlight-on',
  'flashlight-off',
]

export function DeviceCommands({ device }: { device: DeviceView }) {
  const { send, pending, feedback, dismiss } = useDeviceCommands(device.id)

  return (
    <Can perm="devices:write">
      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Remote commands
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Commands are queued if the helmet is offline and delivered when it
          next reports in — usually within a minute.
        </p>

        <div className="flex flex-wrap gap-2">
          {ORDER.map((command) => (
            <button
              key={command}
              onClick={() => send(command)}
              disabled={pending !== null || !device.active}
              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {pending === command ? 'Sending…' : COMMAND_LABELS[command]}
            </button>
          ))}
        </div>

        {!device.active && (
          <p className="mt-2 text-[11px] text-slate-400">
            This helmet is deactivated. Reactivate it before sending commands.
          </p>
        )}

        {feedback && (
          <p
            onClick={dismiss}
            className={`mt-3 cursor-pointer rounded-md border px-3 py-2 text-xs ${
              feedback.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </p>
        )}
      </section>
    </Can>
  )
}
