"use client";

import { useCallback, useMemo, useState } from "react";

import PlaylistRailClient from "@/app/_components/library/playlist-rail-client";
import ReviewQueue from "@/app/_components/review/review-queue";
import type { PlaylistRailData } from "@/lib/spotify/library";
import type { QueueData, QueueSource } from "@/lib/spotify/queue";

type WorkspaceShellProps = {
  playlistRailData: PlaylistRailData | null;
  initialQueueData: QueueData | null;
  initialQueueError?: string | null;
};

const DEFAULT_SOURCE: QueueSource = { type: "liked" };

export default function WorkspaceShell({
  playlistRailData,
  initialQueueData,
  initialQueueError = null,
}: WorkspaceShellProps) {
  const [queueData, setQueueData] = useState<QueueData | null>(initialQueueData);
  const [queueError, setQueueError] = useState<string | null>(initialQueueError);
  const [loading, setLoading] = useState(false);

  const activeId = useMemo(() => {
    if (queueData?.source.type === "playlist") return queueData.source.id;
    return "liked-songs";
  }, [queueData]);

  const handleSelect = useCallback(
    async (item: { id: string; type: "liked" | "playlist" }) => {
      if (!playlistRailData) return;

      const nextSource: QueueSource =
        item.type === "liked"
          ? DEFAULT_SOURCE
          : {
              type: "playlist",
              id: item.id,
            };

      setLoading(true);
      setQueueError(null);
      try {
        const response = await fetch("/api/queue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: nextSource }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load playlist tracks.");
        }

        const data: QueueData = await response.json();
        setQueueData(data);
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        setQueueError(error instanceof Error ? error.message : "Unable to load tracks.");
        setQueueData(null);
      } finally {
        setLoading(false);
      }
    },
    [playlistRailData],
  );

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="self-start lg:sticky lg:top-24 lg:w-[260px]" style={{ maxHeight: "80vh" }}>
        <PlaylistRailClient
          data={
            playlistRailData ?? {
              likedSongs: { total: 0, artwork: null },
              playlists: [],
            }
          }
          appearance="workspace"
          activeId={activeId}
          onSelect={handleSelect}
        />
      </div>
      <ReviewQueue
        data={loading ? null : queueData}
        isAuthenticated
        error={queueError}
        appearance="workspace"
      />
    </div>
  );
}
