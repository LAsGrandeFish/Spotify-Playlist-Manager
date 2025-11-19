import ReviewQueueClient from "@/app/_components/review/review-queue-client";
import type { QueueData } from "@/lib/spotify/queue";

type ReviewQueueProps = {
  data: QueueData | null;
  isAuthenticated: boolean;
  error?: string | null;
  appearance?: "workspace" | "card";
};

export default function ReviewQueue({
  data,
  isAuthenticated,
  error,
  appearance = "card",
}: ReviewQueueProps) {
  const isWorkspace = appearance === "workspace";
  const workspaceClasses =
    "h-full rounded-[32px] border border-[#1f1f1f] bg-[#111111] p-4 text-sm text-zinc-200";
  const cardClasses =
    "rounded-2xl border border-zinc-200 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
  const containerClasses = isWorkspace ? workspaceClasses : cardClasses;

  if (!isAuthenticated) {
    return (
      <div className={containerClasses}>
        <p className="font-semibold text-zinc-50">Queue unavailable</p>
        <p className="mt-2 text-xs text-zinc-400">
          Log in with Spotify to load tracks and start triaging your playlists.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={containerClasses}>
        <p className="font-semibold text-zinc-50">Loading {error ? "queue" : "tracks"}…</p>
        {error ? (
          <p className="mt-2 text-xs text-amber-400">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Fetching tracks for the selected playlist.</p>
        )}
      </div>
    );
  }

  if (data.tracks.length === 0) {
    return (
      <div className={containerClasses}>
        <p className="font-semibold text-zinc-50">No tracks in this selection yet.</p>
        <p className="mt-2 text-xs text-zinc-500">
          Pick another playlist from the rail or add songs to begin reviewing.
        </p>
      </div>
    );
  }

  return <ReviewQueueClient tracks={data.tracks} appearance={appearance} />;
}
