import { SummaryCards } from './components/SummaryCards'
import { DeviceList } from './components/DeviceList'

export function DevicesPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Devices</h1>
      <SummaryCards />
      <DeviceList />
    </div>
  )
}
