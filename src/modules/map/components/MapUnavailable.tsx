import { useEffect } from 'react'

// Users get a plain message; the technical reason goes to the console for whoever maintains the site.
export function MapUnavailable({ heightClass, detail }: { heightClass: string; detail: string }) {
  useEffect(() => {
    console.warn(`[map] ${detail}`)
  }, [detail])

  return (
    <div className={`flex ${heightClass} items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6`}>
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-slate-700">The map isn’t available right now</p>
        <p className="mt-1 text-xs text-slate-500">
          Everything else on this page still works. If this keeps happening, let your administrator know.
        </p>
      </div>
    </div>
  )
}
