"use client";

import clsx from "clsx";

import type { ReviewSummaryData } from "@/app/_components/review/review-stage";

type ReviewSummaryProps = {
  summary: ReviewSummaryData;
  onConfirm?: () => void;
  onRetryFailures?: () => void;
  onRestart?: () => void;
  confirmStatus?: "idle" | "success" | "error";
  confirmErrorMessage?: string | null;
  confirmInProgress?: boolean;
  confirmStage?: string | null;
  confirmStats?: {
    removed?: { requested: number; applied: number } | null;
    added?: { requested: number; applied: number } | null;
    playlists?: { totalTargets: number; created: number; skipped: number } | null;
  } | null;
  failedActionCount?: number;
  confirmAttempts?: Array<{
    id: string;
    status: "STARTED" | "SUCCESS" | "PARTIAL_FAILURE" | "FAILED";
    dryRun: boolean;
    removedRequested: number;
    removedApplied: number;
    addedRequested: number;
    addedApplied: number;
    totalTargets: number;
    playlistsCreated: number;
    playlistsSkipped: number;
    failureCount: number;
    errorMessage: string | null;
    createdAt: string;
  }>;
  confirmAttemptsLoading?: boolean;
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
  onRetryFailures,
  onRestart,
  confirmStatus = "idle",
  confirmErrorMessage = null,
  confirmInProgress = false,
  confirmStage = null,
  confirmStats = null,
  failedActionCount = 0,
  confirmAttempts = [],
  confirmAttemptsLoading = false,
}: ReviewSummaryProps) {
  const removedCount = summary.removed.length;
  const keptCount = summary.kept.length;
  const addedCount = summary.added.length;
  const pendingCount = summary.pendingCount;
  const formatAttemptTime = (createdAt: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt));

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
            disabled={confirmInProgress}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {confirmInProgress
              ? "Applying..."
              : confirmStatus === "success"
                ? "Confirmed"
                : "Confirm"}
          </button>
          {confirmStatus === "error" && failedActionCount > 0 ? (
            <button
              type="button"
              onClick={onRetryFailures}
              disabled={confirmInProgress}
              className="rounded-full border border-sky-500/50 px-5 py-2 text-sm font-semibold text-sky-300 transition hover:border-sky-400 hover:text-sky-200"
            >
              Retry Failed Actions
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            disabled={confirmInProgress}
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
      {confirmStatus === "error" && (
        <p className="mt-4 text-center text-xs text-amber-400">
          {confirmErrorMessage ?? "Failed to apply Spotify changes. Please try again."}
        </p>
      )}
      {confirmStatus === "error" && failedActionCount > 0 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          {failedActionCount} failed action{failedActionCount === 1 ? "" : "s"} can be retried
          without re-running successful changes.
        </p>
      )}
      {(confirmInProgress || confirmStats) && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-[#131313] px-4 py-3 text-xs text-zinc-300">
          {confirmInProgress && (
            <p className="font-medium text-emerald-300">
              {confirmStage ? `${confirmStage}...` : "Applying Spotify changes..."}
            </p>
          )}
          {confirmStats?.removed && (
            <p className="mt-1">
              Remove: {confirmStats.removed.applied}/{confirmStats.removed.requested} applied
            </p>
          )}
          {confirmStats?.added && (
            <p className="mt-1">
              Add: {confirmStats.added.applied}/{confirmStats.added.requested} applied
            </p>
          )}
          {confirmStats?.playlists && (
            <p className="mt-1">
              Playlists: {confirmStats.playlists.created} created, {confirmStats.playlists.skipped}{" "}
              skipped ({confirmStats.playlists.totalTargets} targets)
            </p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#131313] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Recent Confirm Attempts</p>
            <p className="text-xs text-zinc-500">
              Session-scoped audit trail for Spotify confirm runs.
            </p>
          </div>
          {confirmAttemptsLoading ? (
            <span className="text-xs text-zinc-500">Loading...</span>
          ) : (
            <span className="text-xs text-zinc-600">{confirmAttempts.length} recorded</span>
          )}
        </div>

        {confirmAttempts.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {confirmAttempts.map(attempt => (
              <li
                key={attempt.id}
                className="rounded-xl border border-zinc-800 bg-[#0f0f0f] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        attempt.status === "SUCCESS" && "bg-emerald-500/20 text-emerald-300",
                        attempt.status === "PARTIAL_FAILURE" && "bg-amber-500/20 text-amber-300",
                        attempt.status === "FAILED" && "bg-red-500/20 text-red-300",
                        attempt.status === "STARTED" && "bg-sky-500/20 text-sky-300",
                      )}
                    >
                      {attempt.status.replace("_", " ")}
                    </span>
                    {attempt.dryRun ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                        Dry Run
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatAttemptTime(attempt.createdAt)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-3">
                  <p>
                    Remove: {attempt.removedApplied}/{attempt.removedRequested}
                  </p>
                  <p>
                    Add: {attempt.addedApplied}/{attempt.addedRequested}
                  </p>
                  <p>
                    Playlists: {attempt.playlistsCreated} created, {attempt.playlistsSkipped}{" "}
                    skipped
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{attempt.totalTargets} targets</span>
                  <span>{attempt.failureCount} failures</span>
                </div>
                {attempt.errorMessage ? (
                  <p className="mt-2 text-xs text-amber-300">{attempt.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-zinc-500">
            No confirm attempts recorded for this session yet.
          </p>
        )}
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
