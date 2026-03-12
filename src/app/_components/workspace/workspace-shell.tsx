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

type ConfirmApiPayload = {
  error?: string;
  dryRun: boolean;
  removed: { requested: number; applied: number };
  added: { requested: number; applied: number };
  playlists: { totalTargets: number; created: number; skipped: number };
  failures?: Array<{
    stage: "remove" | "create-playlist" | "add";
    targetId?: string;
    chunkSize?: number;
    message: string;
  }>;
  status?: "success" | "partial_failure";
};

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
  const [confirmStatus, setConfirmStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirmErrorMessage, setConfirmErrorMessage] = useState<string | null>(null);
  const [confirmInProgress, setConfirmInProgress] = useState(false);
  const [confirmStage, setConfirmStage] = useState<string | null>(null);
  const [confirmStats, setConfirmStats] = useState<{
    removed?: { requested: number; applied: number } | null;
    added?: { requested: number; applied: number } | null;
    playlists?: { totalTargets: number; created: number; skipped: number } | null;
  } | null>(null);
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

  const redirectToLogin = useCallback(() => {
    window.location.assign("/api/auth/login");
  }, []);

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
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
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
    [playlistRailData, redirectToLogin],
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
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
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
  }, [queueData, loadingMore, redirectToLogin]);

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
              confirmStatus={confirmStatus}
              confirmErrorMessage={confirmErrorMessage}
              confirmInProgress={confirmInProgress}
              confirmStage={confirmStage}
              confirmStats={confirmStats}
              onConfirm={() => {
                if (!summaryData.sessionId) {
                  setMode("view");
                  setSummaryData(null);
                  setReviewSessionKey(key => key + 1);
                  router.refresh();
                  return;
                }
                setConfirmStatus("idle");
                setConfirmErrorMessage(null);
                setConfirmInProgress(true);
                setConfirmStage("Submitting review actions");
                setConfirmStats(null);
                fetch(`/api/review/sessions/${summaryData.sessionId}/confirm`, {
                  method: "POST",
                  headers: {
                    "x-spotify-id": spotifyUser?.spotifyId ?? "",
                  },
                })
                  .then(async response => {
                    setConfirmStage("Applying Spotify changes");
                    const body: ConfirmApiPayload = await response.json().catch(() => ({
                      dryRun: false,
                      removed: { requested: 0, applied: 0 },
                      added: { requested: 0, applied: 0 },
                      playlists: { totalTargets: 0, created: 0, skipped: 0 },
                    }));
                    setConfirmStats({
                      removed: body.removed,
                      added: body.added,
                      playlists: body.playlists,
                    });

                    if (!response.ok) {
                      if (response.status === 401) {
                        redirectToLogin();
                        return;
                      }
                      throw new Error(body?.error || "Failed to confirm review.");
                    }
                    setConfirmStage("Finalizing session");
                    setConfirmStatus("success");
                    setConfirmErrorMessage(null);
                    setConfirmInProgress(false);
                    setConfirmStage(null);
                    setMode("view");
                    setSummaryData(null);
                    setReviewSessionKey(key => key + 1);
                    router.refresh();
                  })
                  .catch(error => {
                    console.error("Failed to confirm review:", error);
                    setConfirmStatus("error");
                    setConfirmInProgress(false);
                    setConfirmStage(null);
                    setConfirmErrorMessage(
                      error instanceof Error ? error.message : "Failed to confirm review.",
                    );
                  });
              }}
              onRestart={() => {
                setConfirmInProgress(false);
                setConfirmStage(null);
                setConfirmStats(null);
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
