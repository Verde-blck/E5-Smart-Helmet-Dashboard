import { useState } from "react";
import { useDeleteMedia, useMediaList } from "./hooks/useMedia";
import { canDeleteMedia } from "./api/media.api";
import { MediaFilters } from "./components/MediaFilters";
import { VideoCalendar } from "./components/VideoCalendar";
import { VideoList } from "./components/VideoList";
import { HelmetVideos } from "./components/HelmetVideos";
import type { MediaQuery } from "./types";
import { RefreshButton } from "@/shared/components/RefreshButton";
import { useTenantId } from "@/shared/hooks/useTenant";
import { qk } from "@/shared/lib/query-keys";

type Tab = "uploaded" | "helmet";

export function VideosPage() {
  const tenantId = useTenantId();
  const [tab, setTab] = useState<Tab>("uploaded");
  const [query, setQuery] = useState<MediaQuery>({ kind: "video" });
  const { media, isLoading, isFetching, isError, cacheKey } =
    useMediaList(query);
  const remove = useDeleteMedia(cacheKey);

  const pending = media.filter((m) => m.status === "uploading").length;

  const tabSwitch = (
    <div
      className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-sm"
      role="group"
      aria-label="Which recordings"
    >
      {(
        [
          ["uploaded", "Uploaded"],
          ["helmet", "Videos on helmet"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          onClick={() => setTab(value)}
          aria-pressed={tab === value}
          className={`rounded px-3 py-1.5 ${
            tab === value
              ? "bg-brand-primary/10 font-medium text-slate-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const tabs = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      {tabSwitch}
      {tab === "uploaded" && <RefreshButton queryKey={qk.media.all(tenantId)} />}
    </div>
  );

  if (tab === "helmet") {
    return (
      <div>
        {tabs}
        <HelmetVideos />
      </div>
    );
  }

  return (
    <div>
      {tabs}
      {pending > 0 && (
        <div className="mb-4">
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
            {pending} still uploading from{" "}
            {pending === 1 ? "a helmet" : "helmets"}
          </span>
        </div>
      )}

      <MediaFilters
        query={query}
        onChange={setQuery}
        withSearch
        resultCount={media.length}
        isFetching={isFetching && !isLoading}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4">
          <VideoCalendar
            deviceId={query.deviceId}
            date={query.date}
            onDateChange={(date) => setQuery({ ...query, date })}
          />
        </div>

        <div className="min-w-0">
          {isLoading && (
            <p className="text-sm text-slate-500">Loading recordings…</p>
          )}
          {isError && (
            <p className="text-sm text-red-600">Failed to load recordings.</p>
          )}

          {!isLoading && !isError && (
            <VideoList
              items={media}
              onDelete={
                canDeleteMedia("video") ? (id) => remove.mutate(id) : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
