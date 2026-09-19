import { useState } from "react";
import { useDeleteMedia, useMediaList } from "./hooks/useMedia";
import { MediaFilters } from "./components/MediaFilters";
import { VideoList } from "./components/VideoList";
import type { MediaQuery } from "./types";

export function VideosPage() {
  const [query, setQuery] = useState<MediaQuery>({ kind: "video" });
  const { media, isLoading, isFetching, isError, cacheKey } =
    useMediaList(query);
  const remove = useDeleteMedia(cacheKey);

  // Recordings the helmet has flagged but not yet delivered. On this fleet
  // that's where most footage lives — one device in the vendor's own console
  // showed 193 recordings with 2 uploaded — so it's worth surfacing rather
  // than leaving an operator to wonder why the list looks short.
  const pending = media.filter((m) => m.status === "uploading").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Video record</h1>
        {pending > 0 && (
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
            {pending} still uploading from{" "}
            {pending === 1 ? "a helmet" : "helmets"}
          </span>
        )}
      </div>

      <MediaFilters
        query={query}
        onChange={setQuery}
        withSearch
        resultCount={media.length}
        isFetching={isFetching && !isLoading}
      />

      {isLoading && (
        <p className="text-sm text-slate-500">Loading recordings…</p>
      )}
      {isError && (
        <p className="text-sm text-red-600">Failed to load recordings.</p>
      )}

      {!isLoading && !isError && (
        <VideoList items={media} onDelete={(id) => remove.mutate(id)} />
      )}
    </div>
  );
}
