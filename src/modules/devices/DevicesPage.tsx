import { useState } from 'react'
import { Can } from '@/shared/components/Can'
import { SummaryCards } from './components/SummaryCards'
import { DeviceList } from './components/DeviceList'
import { RegisterDeviceForm } from './components/RegisterDeviceForm'

export function DevicesPage() {
  const [registering, setRegistering] = useState(false)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Devices</h1>
        <Can perm="devices:write">
          {!registering && (
            <button
              onClick={() => setRegistering(true)}
              className="rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
            >
              + Register helmet
            </button>
          )}
        </Can>
      </div>

      {registering && <RegisterDeviceForm onDone={() => setRegistering(false)} />}

      <SummaryCards />
      <DeviceList />
    </div>
  )
}
