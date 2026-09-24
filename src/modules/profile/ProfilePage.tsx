import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { env } from "@/config/env";
import { usePermission } from "@/shared/hooks/usePermission";
import { applyBrandColors } from "@/shared/lib/color";
import { useTenantProfile, useUpdateProfile } from "./hooks/useTenantProfile";
import { LogoUploader } from "./components/LogoUploader";
import { BrandColorFields } from "./components/BrandColorFields";

const hex = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Use a hex colour, e.g. #0F766E",
  );

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(60, "At most 60 characters"),
  supportEmail: z.union([z.string().email("Not a valid email"), z.literal("")]),
  primary: hex,
  secondary: hex,
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { profile, isLoading, isError } = useTenantProfile();
  const save = useUpdateProfile();
  const can = usePermission();
  const canEdit = can("profile:write");
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profile
      ? {
          name: profile.name,
          supportEmail: profile.supportEmail ?? "",
          primary: profile.colors.primary,
          secondary: profile.colors.secondary,
        }
      : undefined,
  });

  const primary = watch("primary");
  const secondary = watch("secondary");

  // Live preview: colours are pushed into the CSS variables as you pick them,
  // so the sidebar and buttons repaint while you're still deciding. Only valid
  // hex is applied — a half-typed "#0f7" would blank the brand mid-keystroke.
  useEffect(() => {
    if (!canEdit) return;
    if (hex.safeParse(primary).success && hex.safeParse(secondary).success) {
      applyBrandColors({ primary, secondary });
    }
  }, [primary, secondary, canEdit]);

  // Leaving with unsaved colours must not take the preview with you.
  const savedColorsRef = useRef(profile?.colors);
  savedColorsRef.current = profile?.colors;
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty;

  useEffect(
    () => () => {
      if (dirtyRef.current && savedColorsRef.current) {
        applyBrandColors(savedColorsRef.current);
      }
    },
    [],
  );

  function discard() {
    reset();
    if (profile) applyBrandColors(profile.colors);
  }

  async function onSubmit(values: FormValues) {
    setSaved(false);
    await save.mutateAsync({
      name: values.name.trim(),
      supportEmail: values.supportEmail || undefined,
      colors: { primary: values.primary, secondary: values.secondary },
    });
    setSaved(true);
  }

  if (isLoading)
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  if (isError || !profile) {
    return (
      <p className="text-sm text-red-600">
        Failed to load the company profile.
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-slate-800">
        Company profile
      </h1>
  

      {!canEdit && (
        <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          You can view these settings but not change them. Ask an administrator
          for the <span className="font-mono">profile:write</span> permission.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4">
            <label className="mb-1 block text-xs text-slate-500">
              Company name
            </label>
            <input
              {...register("name")}
              disabled={!canEdit}
              className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-slate-500">
              Support email <span className="text-slate-400">(optional)</span>
            </label>
            <input
              {...register("supportEmail")}
              disabled={!canEdit}
              className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
            
            {errors.supportEmail && (
              <p className="mt-1 text-xs text-red-600">
                {errors.supportEmail.message}
              </p>
            )}
          </div>

          <LogoUploader logoUrl={profile.logoUrl} canEdit={canEdit} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Branding
          </h2>
          <BrandColorFields
            primary={primary ?? profile.colors.primary}
            secondary={secondary ?? profile.colors.secondary}
            canEdit={canEdit}
            onChange={(key, value) =>
              setValue(key, value, { shouldDirty: true })
            }
          />
          {(errors.primary || errors.secondary) && (
            <p className="mt-2 text-xs text-red-600">
              {errors.primary?.message ?? errors.secondary?.message}
            </p>
          )}
        </section>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={discard}
              disabled={!isDirty || isSubmitting}
              className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              Discard
            </button>
            {save.isError && (
              <span className="text-xs text-red-600">
                Save failed. Try again.
              </span>
            )}
            {saved && !isDirty && (
              <span className="text-xs text-emerald-600">Saved.</span>
            )}
          </div>
        )}
      </form>

      {env.useMocks && (
        <p className="mt-4 text-[11px] text-slate-400">
          Mock mode — changes persist for this session only and reset on reload.
        </p>
      )}
    </div>
  );
}
