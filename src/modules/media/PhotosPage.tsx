import { useState } from "react";
import { useDeleteMedia, useMediaList } from "./hooks/useMedia";
import { canDeleteMedia } from "./api/media.api";
import { MediaFilters } from "./components/MediaFilters";
import { MediaGrid } from "./components/MediaGrid";
import type { MediaQuery } from "./types";

export function PhotosPage() {
  const [query, setQuery] = useState<MediaQuery>({ kind: "photo" });
  const { media, isLoading, isFetching, isError, cacheKey } =
    useMediaList(query);
  const remove = useDeleteMedia(cacheKey);

  return (
    <div>

      <MediaFilters
        query={query}
        onChange={setQuery}
        resultCount={media.length}
        isFetching={isFetching && !isLoading}
      />

      {isLoading && <p className="text-sm text-slate-500">Loading photos…</p>}
      {isError && (
        <p className="text-sm text-red-600">Failed to load photos.</p>
      )}

      {!isLoading && !isError && (
        <MediaGrid
          items={media}
          onDelete={canDeleteMedia("photo") ? (id) => remove.mutate(id) : undefined}
          emptyMessage={
            query.date || query.deviceId
              ? "No photos match those filters."
              : "No photos captured yet."
          }
        />
      )}
    </div>
  );
}
