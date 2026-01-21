"use client";

import clsx from "clsx";

import type { ReviewSummaryData } from "@/app/_components/review/review-stage";

type ReviewSummaryProps = {
  summary: ReviewSummaryData;
  onConfirm?: () => void;
  onRestart?: () => void;
  confirmStatus?: "idle" | "success" | "error";
};

const Column = ({
  title,
  colorClass,
  tracks,
  showAddCount = false,
}: {
  title: string;
  colorClass: string;
  tracks: {
    id: string;
    title: string;
    artists: string;
    artworkUrl: string | null;
    addCount?: number;
  }[];
  showAddCount?: boolean;
}) => (
  <div className="flex-1 rounded-2xl bg-[#191919] p-3">
    <div
      className={clsx(
        "mb-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white",
        colorClass,
      )}
    >
      {title}
    </div>
    <ul className="space-y-2">
      {tracks.map(track => (
        <li key={track.id} className="flex items-center gap-3 rounded-xl bg-[#111111] px-3 py-2">
          <span className="relative h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900">
            {track.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.artworkUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="block h-full w-full bg-gradient-to-br from-emerald-500 to-purple-500" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{track.title}</p>
            <p className="truncate text-xs text-zinc-400">{track.artists}</p>
          </div>
          {showAddCount && track.addCount ? (
            <span className="ml-auto text-xs font-semibold text-emerald-300">
              +{track.addCount}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  </div>
);

export default function ReviewSummary({
  summary,
  onConfirm,
  onRestart,
  confirmStatus = "idle",
}: ReviewSummaryProps) {
  const removedCount = summary.removed.length;
  const keptCount = summary.kept.length;
  const addedCount = summary.added.length;
  const pendingCount = summary.pendingCount;

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[28px] bg-[#0d0d0d] px-8 py-8 text-white shadow-[0_25px_80px_rgba(0,0,0,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-base font-semibold">Review and confirm changes</p>
          <p className="text-xs text-zinc-500">
            Drag and drop idea is paused; columns are static for now.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {confirmStatus === "success" ? "Confirmed" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Restart
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <span className="relative h-24 w-24 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400">
          {summary.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={summary.artworkUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </span>
        <div className="text-center">
          <p className="text-3xl font-semibold">{summary.playlistTitle}</p>
          <p className="text-sm text-zinc-400">
            <span className="text-red-400">{removedCount} removed</span>,{" "}
            <span className="text-emerald-300">{keptCount} kept</span>,{" "}
            <span className="text-sky-400">{addedCount} added to playlist(s)</span>
          </p>
          {pendingCount > 0 && (
            <p className="mt-1 text-xs text-zinc-500">{pendingCount} tracks left unreviewed</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Column title="Remove" colorClass="bg-red-600" tracks={summary.removed} />
        <Column title="Keep" colorClass="bg-emerald-600" tracks={summary.kept} />
        <Column
          title="Added to Playlist(s)"
          colorClass="bg-sky-600"
          tracks={summary.added}
          showAddCount
        />
      </div>
    </div>
  );
}
