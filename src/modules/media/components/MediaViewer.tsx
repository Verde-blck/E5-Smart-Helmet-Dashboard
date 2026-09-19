import { useEffect } from "react";
import { env } from "@/config/env";
import { Can } from "@/shared/components/Can";
import { formatLastSeen } from "@/modules/devices/lib/presence";
import { useMediaUrl } from "../hooks/useMedia";
import { formatBytes, formatDuration } from "../types";
import type { MediaItem } from "../types";

interface Props {
  item: MediaItem;
  now: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDelete?: (id: string) => void;
}

export function MediaViewer({
  item,
  now,
  onClose,
  onPrev,
  onNext,
  onDelete,
}: Props) {
  const { data: signed, isLoading, isError, refetch } = useMediaUrl(item.id);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev?.();
      if (event.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const meta = [
    item.deviceName,
    formatLastSeen(item.capturedAt, now),
    formatDuration(item.durationMs),
    formatBytes(item.sizeBytes),
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-full w-full max-w-3xl overflow-hidden rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {item.kind === "video" ? "Recording" : "Photo"} ·{" "}
              {item.deviceName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {meta.join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Can
                perm={item.kind === "video" ? "videos:delete" : "photos:delete"}
              >
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </Can>
            )}
            <button
              onClick={onClose}
              className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex min-h-[18rem] items-center justify-center bg-slate-900">
          {isLoading && (
            <p className="text-sm text-slate-400">Requesting secure link…</p>
          )}

          {isError && (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-300">
                That link couldn't be issued.
              </p>
              <button
                onClick={() => void refetch()}
                className="mt-2 rounded border border-slate-600 px-3 py-1 text-xs text-slate-200"
              >
                Try again
              </button>
            </div>
          )}

          {signed && item.kind === "photo" && (
            <img
              src={signed.url}
              alt=""
              className="max-h-[60vh] w-full object-contain"
            />
          )}

          {signed && item.kind === "video" && !env.useMocks && (
            <video
              src={signed.url}
              controls
              autoPlay
              className="max-h-[60vh] w-full"
              // A signed URL can lapse mid-playback on a long recording. One
              // refetch re-signs it rather than leaving a dead player.
              onError={() => void refetch()}
            />
          )}

          {signed && item.kind === "video" && env.useMocks && (
            <div className="p-8 text-center">
              <img src={signed.url} alt="" className="mx-auto max-h-[40vh]" />
              <p className="mt-3 text-xs text-slate-400">
                Mock mode — no video file exists. The real player mounts here
                once VITE_USE_MOCKS is false.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30"
          >
            ← Previous
          </button>
          <span>
            {item.triggeredBy === "alarm"
              ? "Captured by alarm trigger"
              : item.triggeredBy === "remote-command"
                ? "Captured by remote command"
                : "Captured manually"}
          </span>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
