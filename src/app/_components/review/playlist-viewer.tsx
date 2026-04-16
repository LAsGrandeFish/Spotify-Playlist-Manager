"use client";

import clsx from "clsx";
import Image from "next/image";
import { useMemo } from "react";

import type { QueueData, QueueTrack } from "@/lib/spotify/queue";
import { formatDuration } from "@/lib/spotify/queue";

type PlaylistMeta = {
  title: string;
  total: number;
  artworkUrl: string | null;
};

type PlaylistViewerProps = {
  data: QueueData | null;
  meta: PlaylistMeta;
  loading: boolean;
  error: string | null;
  notice?: string | null;
  onReview?: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
};

const gradientPalette = [
  "from-rose-500 to-purple-500",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-500",
  "from-fuchsia-500 to-pink-500",
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-blue-600",
];

const getGradient = (index: number) => gradientPalette[index % gradientPalette.length];

const TrackRow = ({
  track,
  index,
  artworkFallbackIndex,
}: {
  track: QueueTrack;
  index: number;
  artworkFallbackIndex: number;
}) => (
  <li
    className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px] items-center gap-4 border-b border-zinc-800/60 px-3 py-2 text-sm text-zinc-100 last:border-none"
    role="row"
  >
    <span className="text-center text-xs text-zinc-500">{index}</span>
    <div className="flex items-center gap-3">
      <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-zinc-900">
        {track.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.artworkUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={clsx(
              "block h-full w-full bg-gradient-to-br",
              getGradient(artworkFallbackIndex),
            )}
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-white">{track.title}</p>
        <p className="truncate text-xs text-zinc-400">{track.artists}</p>
      </div>
    </div>
    <div className="truncate text-xs text-zinc-400">{track.album}</div>
    <div className="text-right text-xs text-zinc-300">{formatDuration(track.durationMs)}</div>
  </li>
);

export default function PlaylistViewer({
  data,
  meta,
  loading,
  error,
  notice = null,
  onReview,
  onLoadMore,
  loadingMore = false,
}: PlaylistViewerProps) {
  const tracks = data?.tracks ?? [];
  const total = data?.total ?? meta.total;

  const computedTotal = useMemo(() => {
    if (total) return total;
    return tracks.length;
  }, [total, tracks.length]);

  return (
    <div className="rounded-[28px] border border-black/50 bg-gradient-to-b from-[#1c1c1c] via-[#0f0f0f] to-[#070707] text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 px-6 pb-6 pt-6 sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:pt-8">
        <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg">
          {meta.artworkUrl ? (
            <Image
              src={meta.artworkUrl}
              alt={`${meta.title} cover`}
              fill
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">Playlist</div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{meta.title}</h1>
          <p className="text-sm text-zinc-400">{computedTotal} songs</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              disabled={loading || !!error || tracks.length === 0}
            >
              Review
            </button>
            {onLoadMore && data?.nextOffset != null && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading more..." : "Load more"}
              </button>
            )}
          </div>
        </div>
      </div>

      {notice ? (
        <div className="mx-6 mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200 sm:mx-8">
          {notice}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border-t border-white/5 bg-black/40">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px] items-center gap-4 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
          <span className="text-center">#</span>
          <span>Title</span>
          <span>Album</span>
          <span className="text-right">Duration</span>
        </div>
        <ul role="rowgroup" className="divide-y divide-zinc-800/60">
          {loading ? (
            <li className="px-3 py-6 text-center text-sm text-zinc-400">Loading tracks…</li>
          ) : error ? (
            <li className="px-3 py-6 text-center text-sm text-amber-400">{error}</li>
          ) : tracks.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-zinc-400">
              No tracks available for this selection.
            </li>
          ) : (
            tracks.map((track, idx) => (
              <TrackRow
                key={track.id ?? `${track.title}-${idx}`}
                track={track}
                index={(data?.offset ?? 0) + idx + 1}
                artworkFallbackIndex={idx}
              />
            ))
          )}
        </ul>
        {onLoadMore && data?.nextOffset != null && !loading && (
          <div className="flex justify-center px-3 py-4">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading more..." : "Load more tracks"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
