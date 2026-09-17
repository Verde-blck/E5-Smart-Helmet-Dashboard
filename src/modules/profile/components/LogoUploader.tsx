import { useRef, useState } from 'react'
import {
  LOGO_ACCEPTED_TYPES,
  LOGO_MAX_BYTES,
  LOGO_MAX_DIMENSION,
  LOGO_MIN_DIMENSION,
  describeLogoTypes,
} from '../types'
import { useRemoveLogo, useUploadLogo } from '../hooks/useTenantProfile'

type Accepted = (typeof LOGO_ACCEPTED_TYPES)[number]

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url) // or the blob leaks for the life of the tab
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That file isn't a readable image"))
    }
    image.src = url
  })
}

/**
 * Client-side checks here are for fast feedback, not safety. The backend must
 * repeat every one of them against the actual bytes — a declared MIME type is
 * just a string the browser sent.
 */
async function validate(file: File): Promise<string | null> {
  if (!LOGO_ACCEPTED_TYPES.includes(file.type as Accepted)) {
    return `Use ${describeLogoTypes()}. SVG isn't accepted, because it can carry script that would run on every page of your dashboard.`
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `That file is ${Math.round(file.size / 1024)}KB. The limit is ${LOGO_MAX_BYTES / 1024}KB.`
  }

  try {
    const { width, height } = await readDimensions(file)
    if (width > LOGO_MAX_DIMENSION || height > LOGO_MAX_DIMENSION) {
      return `That image is ${width}×${height}. The limit is ${LOGO_MAX_DIMENSION}px on each side.`
    }
    if (width < LOGO_MIN_DIMENSION || height < LOGO_MIN_DIMENSION) {
      return `That image is ${width}×${height}, too small to stay sharp in the sidebar.`
    }
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not read that image'
  }

  return null
}

export function LogoUploader({ logoUrl, canEdit }: { logoUrl: string; canEdit: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadLogo()
  const remove = useRemoveLogo()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    const problem = await validate(file)
    if (problem) {
      setError(problem)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    upload.mutate(file, {
      onError: () => setError('Upload failed. Please try again.'),
      onSettled: () => {
        // Clear the input so picking the same file twice still fires onChange.
        if (inputRef.current) inputRef.current.value = ''
      },
    })
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">Company logo</label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
          ) : (
            <div className="h-8 w-8 rounded bg-brand-primary" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canEdit || upload.isPending}
              onClick={() => inputRef.current?.click()}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {upload.isPending ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
            </button>
            {logoUrl && (
              <button
                type="button"
                disabled={!canEdit || remove.isPending}
                onClick={() => remove.mutate()}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {describeLogoTypes()}, up to {LOGO_MAX_BYTES / 1024}KB and{' '}
            {LOGO_MAX_DIMENSION}px per side.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={LOGO_ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
