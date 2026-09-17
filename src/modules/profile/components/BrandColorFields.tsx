interface Props {
  primary: string
  secondary: string
  canEdit: boolean
  onChange: (key: 'primary' | 'secondary', value: string) => void
}

function ColorField({
  label,
  hint,
  value,
  canEdit,
  onChange,
}: {
  label: string
  hint: string
  value: string
  canEdit: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          disabled={!canEdit}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white disabled:cursor-default"
          aria-label={`${label} colour picker`}
        />
        {/* Hex field alongside the picker, because brand guidelines arrive as
            hex codes and nobody can find #0F766E by dragging a swatch. */}
        <input
          type="text"
          value={value}
          disabled={!canEdit}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-28 rounded border border-slate-300 px-2 py-1 font-mono text-xs uppercase disabled:bg-slate-50"
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  )
}

export function BrandColorFields({ primary, secondary, canEdit, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ColorField
        label="Primary colour"
        hint="Buttons, active nav, highlights."
        value={primary}
        canEdit={canEdit}
        onChange={(v) => onChange('primary', v)}
      />
      <ColorField
        label="Secondary colour"
        hint="Supporting surfaces and accents."
        value={secondary}
        canEdit={canEdit}
        onChange={(v) => onChange('secondary', v)}
      />
    </div>
  )
}
