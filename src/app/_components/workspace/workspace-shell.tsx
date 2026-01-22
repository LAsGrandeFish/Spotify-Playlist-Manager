"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PlaylistRailClient from "@/app/_components/library/playlist-rail-client";
import PlaylistViewer from "@/app/_components/review/playlist-viewer";
import ReviewStage, { type ReviewSummaryData } from "@/app/_components/review/review-stage";
import ReviewSummary from "@/app/_components/review/review-summary";
import type { PlaylistRailData } from "@/lib/spotify/library";
import type { QueueData, QueueSource } from "@/lib/spotify/queue";

type WorkspaceShellProps = {
  playlistRailData: PlaylistRailData | null;
  initialQueueData: QueueData | null;
  initialQueueError?: string | null;
  spotifyUser: {
    spotifyId: string;
    displayName: string | null;
    email: string | null;
  } | null;
};

const DEFAULT_SOURCE: QueueSource = { type: "liked" };

export default function WorkspaceShell({
  playlistRailData,
  initialQueueData,
  initialQueueError = null,
  spotifyUser,
}: WorkspaceShellProps) {
  const router = useRouter();
  const [queueData, setQueueData] = useState<QueueData | null>(initialQueueData);
  const [queueError, setQueueError] = useState<string | null>(initialQueueError);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<"view" | "review" | "summary">("view");
  const [reviewSessionKey, setReviewSessionKey] = useState(0);
  const [summaryData, setSummaryData] = useState<ReviewSummaryData | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{
    title: string;
    total: number;
    artworkUrl: string | null;
  }>(() => ({
    title:
      initialQueueData?.source.type === "playlist"
        ? (initialQueueData.source.name ?? "Playlist")
        : "Liked Songs",
    total: initialQueueData?.total ?? playlistRailData?.likedSongs?.total ?? 0,
    artworkUrl:
      initialQueueData?.source.type === "playlist"
        ? (playlistRailData?.playlists.find(p => p.id === initialQueueData.source.id)?.images?.[0]
            ?.url ?? null)
        : (playlistRailData?.likedSongs?.artwork?.url ?? null),
  }));

  const activeId = useMemo(() => {
    if (queueData?.source.type === "playlist") return queueData.source.id;
    return "liked-songs";
  }, [queueData]);

  const handleSelect = useCallback(
    async (item: { id: string; name: string; type: "liked" | "playlist" }) => {
      if (!playlistRailData) return;

      const nextSource: QueueSource =
        item.type === "liked"
          ? DEFAULT_SOURCE
          : {
              type: "playlist",
              id: item.id,
              name: item.name,
            };

      setLoading(true);
      setLoadingMore(false);
      setQueueError(null);
      setMode("view");
      const playlistMeta =
        item.type === "liked"
          ? {
              title: "Liked Songs",
              total: playlistRailData?.likedSongs?.total ?? 0,
              artworkUrl: playlistRailData?.likedSongs?.artwork?.url ?? null,
            }
          : (() => {
              const found = playlistRailData?.playlists.find(p => p.id === item.id);
              return {
                title: item.name,
                total: found?.totalTracks ?? 0,
                artworkUrl: found?.images?.[0]?.url ?? null,
              };
            })();
      setSelectedMeta(playlistMeta);
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

  const handleLoadMore = useCallback(async () => {
    if (!queueData || queueData.nextOffset == null || loadingMore) return;
    setLoadingMore(true);
    setQueueError(null);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: queueData.source,
          offset: queueData.tracks.length,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to load more tracks.");
      }

      const data: QueueData = await response.json();
      setQueueData(prev =>
        prev &&
        data.source.type === prev.source.type &&
        JSON.stringify(data.source) === JSON.stringify(prev.source)
          ? {
              ...data,
              tracks: [...prev.tracks, ...data.tracks],
            }
          : data,
      );
    } catch (error) {
      console.error("Failed to load more queue items:", error);
      setQueueError(error instanceof Error ? error.message : "Unable to load more tracks.");
    } finally {
      setLoadingMore(false);
    }
  }, [queueData, loadingMore]);

  return (
    <div
      className={
        mode === "summary"
          ? "mt-6 flex w-full justify-center"
          : "mt-6 grid gap-5 lg:grid-cols-[280px_1fr]"
      }
    >
      {mode !== "summary" && (
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
            onSelect={item => handleSelect({ ...item, name: item.name })}
          />
        </div>
      )}
      <div className={mode === "summary" ? "w-full max-w-6xl" : "flex flex-col gap-3"}>
        {mode === "view" ? (
          <PlaylistViewer
            data={loading ? null : queueData}
            meta={selectedMeta}
            loading={loading}
            error={queueError}
            onReview={() => setMode("review")}
            onLoadMore={queueData?.nextOffset != null ? handleLoadMore : undefined}
            loadingMore={loadingMore}
          />
        ) : mode === "review" ? (
          <ReviewStage
            key={reviewSessionKey}
            playlistRailData={playlistRailData}
            queueData={loading ? null : queueData}
            loading={loading}
            error={queueError}
            onLoadMore={queueData?.nextOffset != null ? handleLoadMore : undefined}
            loadingMore={loadingMore}
            playlistMeta={{ title: selectedMeta.title, artworkUrl: selectedMeta.artworkUrl }}
            spotifyUser={spotifyUser}
            onFinish={summary => {
              setSummaryData(summary);
              setMode("summary");
            }}
          />
        ) : (
          summaryData && (
            <ReviewSummary
              summary={summaryData}
              onConfirm={() => {
                setSummaryData({ ...summaryData });
                setMode("view");
                setSummaryData(null);
                setReviewSessionKey(key => key + 1);
                router.refresh();
              }}
              onRestart={() => {
                setMode("review");
                setSummaryData(null);
                setReviewSessionKey(key => key + 1);
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
