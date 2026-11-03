import { alarmLabel, isSos } from '../types'
import type { Alarm, AlarmType } from '../types'

const DETAIL: Partial<Record<AlarmType, string>> = {
  'sos-button': 'The wearer held the SOS button and is waiting in a call.',
  sos: 'The helmet raised an SOS.',
  fall: 'The helmet detected a fall or a heavy impact.',
  silent: 'The wearer hasn’t moved for longer than the set time.',
  'near-electric': 'The helmet detected live electricity close by.',
  'gas-co': 'Carbon monoxide is above the safe level.',
  'gas-h2s': 'Hydrogen sulphide is above the safe level.',
  'gas-ch4': 'Methane is above the safe level: risk of fire or explosion.',
  'gas-o2-low': 'Oxygen is below the safe level.',
  'helmet-removal': 'The helmet was taken off.',
  geofence: 'The wearer left their work area.',
  'restricted-area': 'The wearer entered a restricted area.',
  temperature: 'The temperature is above the set limit.',
  ascending: 'The wearer is working at height.',
  'beacon-enter': 'The wearer entered a beacon zone.',
  'beacon-leave': 'The wearer left a beacon zone.',
  'body-temperature': 'The wristband reports a high body temperature.',
  'heart-rate': 'The wristband reports an abnormal heart rate.',
  'blood-pressure': 'The wristband reports abnormal blood pressure.',
  'voice-message': 'The wearer sent a voice message.',
}

export function alarmTitle(type: AlarmType): string {
  return isSos(type) ? 'SOS pressed' : alarmLabel(type)
}

export function alarmDetail(alarm: Alarm): string {
  const base = DETAIL[alarm.type] ?? 'The helmet raised an alarm.'
  return alarm.note ? `${base} ${alarm.note}` : base
}
