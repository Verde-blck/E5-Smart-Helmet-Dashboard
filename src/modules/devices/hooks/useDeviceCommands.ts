import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { COMMAND_LABELS, sendCommand } from '../api/commands.api'
import type { DeviceCommand } from '../api/commands.api'

export interface CommandFeedback {
  command: DeviceCommand
  ok: boolean
  message: string
}

export function useDeviceCommands(deviceId: string) {
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null)
  const [pending, setPending] = useState<DeviceCommand | null>(null)

  const mutation = useMutation({
    mutationFn: (command: DeviceCommand) => sendCommand(deviceId, command),
    onMutate: (command) => {
      setPending(command)
      setFeedback(null)
    },
    onSuccess: (_data, command) => {
      setFeedback({
        command,
        ok: true,
        // Deliberately not "photo taken". The backend queues commands for a
        // helmet that's briefly offline, so acceptance is all we know.
        message: `${COMMAND_LABELS[command]} sent. It will run when the helmet next reports in.`,
      })
    },
    onError: (_error, command) => {
      setFeedback({
        command,
        ok: false,
        message: `${COMMAND_LABELS[command]} could not be sent. Try again.`,
      })
    },
    onSettled: () => setPending(null),
  })

  return {
    send: (command: DeviceCommand) => mutation.mutate(command),
    pending,
    feedback,
    dismiss: () => setFeedback(null),
  }
}
