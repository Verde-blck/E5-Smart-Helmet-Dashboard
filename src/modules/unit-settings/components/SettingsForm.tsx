import { useEffect, useState } from 'react'
import { Can } from '@/shared/components/Can'
import { useSaveHelmetSettings } from '../hooks/useHelmetSettings'
import {
  ALARM_LABELS,
  BROADCAST_LANGUAGES,
  PICTURE_QUALITIES,
  UPLOAD_METHODS,
} from '../types'
import type { AlarmSwitches, HelmetSettings } from '../types'
import type { DeviceView } from '@/modules/devices/types'

const input = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm'

function Section({ title, hint, children }: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h3>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Row({ label, unit, hint, children }: {
  label: string
  unit?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <label className="pt-1.5 text-sm text-slate-600">
        {label}
        {unit && <span className="text-slate-400"> ({unit})</span>}
      </label>
      <div>
        {children}
        {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  )
}

function Toggle({ value, onChange, disabled }: {
  value: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-4 pt-1.5 text-sm">
      {[true, false].map((option) => (
        <label key={String(option)} className="flex cursor-pointer items-center gap-1.5">
          <input
            type="radio"
            checked={value === option}
            disabled={disabled}
            onChange={() => onChange(option)}
            className="h-3.5 w-3.5 accent-brand-primary"
          />
          <span className={option ? 'text-emerald-700' : 'text-slate-500'}>
            {option ? 'Open' : 'Shut down'}
          </span>
        </label>
      ))}
    </div>
  )
}

export function SettingsForm({
  device,
  initial,
}: {
  device: DeviceView
  initial: HelmetSettings
}) {
  const [draft, setDraft] = useState<HelmetSettings>(initial)
  const [saved, setSaved] = useState(false)
  const save = useSaveHelmetSettings(device.id)

  // Reset when a different helmet is picked, or one device's edits would
  // silently carry over onto the next.
  useEffect(() => {
    setDraft(initial)
    setSaved(false)
  }, [initial, device.id])

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const set = <K extends keyof HelmetSettings>(key: K, value: HelmetSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const setAlarm = (key: keyof AlarmSwitches, value: boolean) => {
    setDraft((prev) => ({ ...prev, alarms: { ...prev.alarms, [key]: value } }))
    setSaved(false)
  }

  const disarmed = ALARM_LABELS.filter((a) => !draft.alarms[a.key])
  const criticalDisarmed = disarmed.filter((a) => a.critical)

  return (
    <div className="space-y-4">
      <Section
        title="Connection"
        hint="Where the helmet reports, and how often."
      >
        <Row label="HTTP request address">
          <input
            value={draft.httpAddress}
            onChange={(e) => set('httpAddress', e.target.value)}
            spellCheck={false}
            className={input}
          />
        </Row>
        <Row label="Long link address">
          <input
            value={draft.longLinkAddress}
            onChange={(e) => set('longLinkAddress', e.target.value)}
            spellCheck={false}
            className={input}
          />
        </Row>
        <Row
          label="Heartbeat (BEATTIM)"
          unit="seconds"
          hint={
            draft.heartbeatSeconds > 60
              ? 'Above 60s this helmet will read as offline between beats — the dashboard treats two minutes of silence as offline.'
              : 'Drives both the online/offline rule and the monthly data cost.'
          }
        >
          <input
            type="number"
            min={0}
            value={draft.heartbeatSeconds}
            onChange={(e) => set('heartbeatSeconds', Number(e.target.value))}
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
      </Section>

      <Section title="Detection thresholds">
        <Row label="Alarm temperature" unit="°C">
          <input
            type="number"
            value={draft.alarmTemperatureC ?? ''}
            onChange={(e) =>
              set('alarmTemperatureC', e.target.value === '' ? null : Number(e.target.value))
            }
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
        <Row label="Shutdown temperature" unit="°C">
          <input
            type="number"
            value={draft.shutdownTemperatureC ?? ''}
            onChange={(e) =>
              set('shutdownTemperatureC', e.target.value === '' ? null : Number(e.target.value))
            }
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
        <Row
          label="Near-electric alarm voltage"
          unit="V"
          hint="Proximity threshold for contact with live conductors."
        >
          <input
            type="number"
            min={0}
            value={draft.nearElectricVoltage}
            onChange={(e) => set('nearElectricVoltage', Number(e.target.value))}
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
        <Row label="Hat-off delay alarm time" unit="seconds">
          <input
            type="number"
            min={0}
            value={draft.hatOffDelaySeconds}
            onChange={(e) => set('hatOffDelaySeconds', Number(e.target.value))}
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
        <Row label="Silence detection" unit="minutes" hint="No movement for this long raises the silent alarm.">
          <input
            type="number"
            min={0}
            value={draft.silenceDetectionMinutes}
            onChange={(e) => set('silenceDetectionMinutes', Number(e.target.value))}
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
        <Row label="Hat-off detection" unit="minutes">
          <input
            type="number"
            min={0}
            value={draft.hatOffDetectionMinutes}
            onChange={(e) => set('hatOffDetectionMinutes', Number(e.target.value))}
            className={`${input} sm:max-w-[10rem]`}
          />
        </Row>
      </Section>

      <Section title="Capture and upload">
        <Row label="Upload method">
          <div className="space-y-1 pt-1">
            {UPLOAD_METHODS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  checked={draft.uploadMethod === option.value}
                  onChange={() => set('uploadMethod', option.value)}
                  className="mt-1 h-3.5 w-3.5 accent-brand-primary"
                />
                <span>
                  <span className="text-slate-700">{option.label}</span>
                  {option.note && (
                    <span className="block text-[11px] text-slate-400">{option.note}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </Row>

        <Row label="Picture quality">
          <div className="flex gap-4 pt-1.5 text-sm">
            {PICTURE_QUALITIES.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  checked={draft.pictureQuality === option.value}
                  onChange={() => set('pictureQuality', option.value)}
                  className="h-3.5 w-3.5 accent-brand-primary"
                />
                <span className="text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        </Row>

        <Row label="Hook broadcast language">
          <select
            value={draft.broadcastLanguage}
            onChange={(e) => set('broadcastLanguage', e.target.value as HelmetSettings['broadcastLanguage'])}
            className={`${input} sm:max-w-[12rem]`}
          >
            {BROADCAST_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Enable local recording">
          <Toggle value={draft.localRecording} onChange={(v) => set('localRecording', v)} />
        </Row>

        <Row label="Bluetooth beacon scan" hint="Used for indoor positioning where GPS can't reach.">
          <Toggle
            value={draft.bluetoothBeaconScan}
            onChange={(v) => set('bluetoothBeaconScan', v)}
          />
        </Row>

        <Row label="Split recordings" hint="Segments long recordings rather than producing one large file.">
          <Toggle value={draft.videoSplit} onChange={(v) => set('videoSplit', v)} />
        </Row>
      </Section>

      <Section
        title="Alarms"
        hint="Turning an alarm off here stops the helmet raising it at all — it will never reach the Alarm Record."
      >
        {criticalDisarmed.length > 0 && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {criticalDisarmed.map((a) => a.label).join(', ')}{' '}
            {criticalDisarmed.length === 1 ? 'is' : 'are'} switched off. These are the alarms
            that signal someone may be in immediate danger.
          </p>
        )}

        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {ALARM_LABELS.map((alarm) => (
            <div key={alarm.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">
                {alarm.label}
                {alarm.critical && <span className="ml-1 text-[10px] text-red-500">critical</span>}
              </span>
              <Toggle
                value={draft.alarms[alarm.key]}
                onChange={(v) => setAlarm(alarm.key, v)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Can perm="devices:write">
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <button
            onClick={() =>
              save.mutate(draft, {
                onSuccess: () => setSaved(true),
              })
            }
            disabled={!dirty || save.isPending}
            className="rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {save.isPending ? 'Sending…' : 'Save to helmet'}
          </button>
          <button
            onClick={() => setDraft(initial)}
            disabled={!dirty || save.isPending}
            className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Discard
          </button>

          {save.isError && (
            <span className="text-xs text-red-600">Could not save. Try again.</span>
          )}
          {saved && !dirty && (
            <span className="text-xs text-emerald-700">
              {/* Same honesty as the remote commands: the helmet may be
                  offline, so acceptance isn't confirmation. */}
              Saved. Settings apply when the helmet next reports in.
            </span>
          )}
          {dirty && !save.isPending && (
            <span className="text-xs text-amber-700">Unsaved changes</span>
          )}
        </div>
      </Can>
    </div>
  )
}
