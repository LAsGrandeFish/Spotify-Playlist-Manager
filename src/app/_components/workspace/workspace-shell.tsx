"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  attemptId?: string | null;
  dryRun: boolean;
  removed: { requested: number; applied: number };
  added: { requested: number; applied: number };
  playlists: { totalTargets: number; created: number; skipped: number };
  failures?: Array<{
    stage: "remove" | "create-playlist" | "add";
    targetId?: string;
    originalTargetId?: string;
    chunkSize?: number;
    trackIds?: string[];
    playlistName?: string | null;
    message: string;
  }>;
  status?: "success" | "partial_failure";
};

type ConfirmAttemptHistoryItem = {
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
  failureLog: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export default function WorkspaceShell({
  playlistRailData,
  initialQueueData,
  initialQueueError = null,
  spotifyUser,
}: WorkspaceShellProps) {
  const router = useRouter();
  const [playlistRailState, setPlaylistRailState] = useState<PlaylistRailData | null>(
    playlistRailData,
  );
  const [queueData, setQueueData] = useState<QueueData | null>(initialQueueData);
  const [queueError, setQueueError] = useState<string | null>(initialQueueError);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
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
  const [confirmFailures, setConfirmFailures] = useState<ConfirmApiPayload["failures"]>([]);
  const [confirmAttempts, setConfirmAttempts] = useState<ConfirmAttemptHistoryItem[]>([]);
  const [confirmAttemptsLoading, setConfirmAttemptsLoading] = useState(false);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{
    title: string;
    total: number;
    artworkUrl: string | null;
    sourceType: "liked" | "playlist";
    canManage: boolean;
  }>(() => ({
    title:
      initialQueueData?.source.type === "playlist"
        ? (initialQueueData.source.name ?? "Playlist")
        : "Liked Songs",
    total: initialQueueData?.total ?? playlistRailState?.likedSongs?.total ?? 0,
    artworkUrl:
      initialQueueData?.source.type === "playlist"
        ? (playlistRailState?.playlists.find(
            p =>
              p.id ===
              (initialQueueData.source.type === "playlist" ? initialQueueData.source.id : ""),
          )?.images?.[0]?.url ?? null)
        : (playlistRailState?.likedSongs?.artwork?.url ?? null),
    sourceType: initialQueueData?.source.type === "playlist" ? "playlist" : "liked",
    canManage:
      initialQueueData?.source.type === "playlist"
        ? playlistRailState?.playlists.find(
            p =>
              p.id ===
              (initialQueueData.source.type === "playlist" ? initialQueueData.source.id : ""),
          )?.ownerId === spotifyUser?.spotifyId
        : false,
  }));

  useEffect(() => {
    setPlaylistRailState(playlistRailData);
  }, [playlistRailData]);

  const sortedPlaylistRailState = useMemo(() => {
    if (!playlistRailState) return null;

    const collator = new Intl.Collator(undefined, {
      sensitivity: "base",
      numeric: true,
    });

    const playlists = [...playlistRailState.playlists].sort((a, b) => {
      const aOwned = a.ownerId === spotifyUser?.spotifyId;
      const bOwned = b.ownerId === spotifyUser?.spotifyId;

      if (aOwned !== bOwned) {
        return aOwned ? -1 : 1;
      }

      return collator.compare(a.name, b.name);
    });

    return {
      ...playlistRailState,
      playlists,
    };
  }, [playlistRailState, spotifyUser?.spotifyId]);

  const activeId = useMemo(() => {
    if (queueData?.source.type === "playlist") return queueData.source.id;
    return "liked-songs";
  }, [queueData]);

  const activePlaylistSource = queueData?.source.type === "playlist" ? queueData.source : null;

  const redirectToLogin = useCallback(() => {
    window.location.assign("/api/auth/login");
  }, []);

  const fetchSourceQueue = useCallback(
    async (source: QueueSource, options?: { offset?: number; limit?: number }) => {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          ...(options?.offset != null ? { offset: options.offset } : {}),
          ...(options?.limit != null ? { limit: options.limit } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 401) {
          redirectToLogin();
          return null;
        }
        throw new Error(body?.error || "Failed to load playlist tracks.");
      }

      return (await response.json()) as QueueData;
    },
    [redirectToLogin],
  );

  const reconcileCurrentSource = useCallback(
    async (removedApplied: number) => {
      if (!queueData) return;

      const expectedTotal = Math.max(0, queueData.total - removedApplied);
      const refreshedQueue = await fetchSourceQueue(queueData.source, {
        limit: Math.max(queueData.tracks.length, 50),
      });

      if (!refreshedQueue) {
        return;
      }

      const refreshedPlaylistId =
        refreshedQueue.source.type === "playlist" ? refreshedQueue.source.id : null;

      setQueueData(refreshedQueue);
      setPlaylistRailState(prev => {
        if (!prev) return prev;

        if (refreshedPlaylistId) {
          return {
            ...prev,
            playlists: prev.playlists.map(playlist =>
              playlist.id === refreshedPlaylistId
                ? { ...playlist, totalTracks: refreshedQueue.total }
                : playlist,
            ),
          };
        }

        return {
          ...prev,
          likedSongs: {
            ...prev.likedSongs,
            total: refreshedQueue.total,
          },
        };
      });
      setSelectedMeta(prev => ({
        ...prev,
        total: refreshedQueue.total,
        title:
          refreshedQueue.source.type === "playlist"
            ? (refreshedQueue.source.name ?? prev.title)
            : "Liked Songs",
      }));

      if (refreshedQueue.total !== expectedTotal) {
        setQueueNotice(
          `Spotify changes applied, but reconciliation found ${refreshedQueue.total} songs instead of the expected ${expectedTotal}. Refresh again or verify in Spotify directly.`,
        );
      } else {
        setQueueNotice(
          "Spotify changes applied and the refreshed playlist matches the expected total.",
        );
      }
    },
    [fetchSourceQueue, queueData],
  );

  const loadConfirmAttempts = useCallback(
    async (sessionId: string) => {
      setConfirmAttemptsLoading(true);
      try {
        const response = await fetch(`/api/review/sessions/${sessionId}/attempts`, {
          headers: {
            "x-spotify-id": spotifyUser?.spotifyId ?? "",
          },
        });
        const body = await response.json().catch(() => ({ attempts: [] }));

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
          throw new Error(body?.error || "Failed to load confirm attempts.");
        }

        setConfirmAttempts(body.attempts ?? []);
      } catch (error) {
        console.error("Failed to load confirm attempts:", error);
      } finally {
        setConfirmAttemptsLoading(false);
      }
    },
    [redirectToLogin, spotifyUser?.spotifyId],
  );

  const handleSelect = useCallback(
    async (item: { id: string; name: string; type: "liked" | "playlist" }) => {
      if (!sortedPlaylistRailState) return;

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
      setQueueNotice(null);
      setMode("view");
      const playlistMeta =
        item.type === "liked"
          ? {
              title: "Liked Songs",
              total: sortedPlaylistRailState?.likedSongs?.total ?? 0,
              artworkUrl: sortedPlaylistRailState?.likedSongs?.artwork?.url ?? null,
              sourceType: "liked" as const,
              canManage: false,
            }
          : (() => {
              const found = sortedPlaylistRailState?.playlists.find(p => p.id === item.id);
              return {
                title: item.name,
                total: found?.totalTracks ?? 0,
                artworkUrl: found?.images?.[0]?.url ?? null,
                sourceType: "playlist" as const,
                canManage: found?.ownerId === spotifyUser?.spotifyId,
              };
            })();
      setSelectedMeta(playlistMeta);
      try {
        const data = await fetchSourceQueue(nextSource);
        if (!data) {
          return;
        }
        setQueueData(data);
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        setQueueError(error instanceof Error ? error.message : "Unable to load tracks.");
        setQueueData(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchSourceQueue, sortedPlaylistRailState, spotifyUser?.spotifyId],
  );

  const handleLoadMore = useCallback(async () => {
    if (!queueData || queueData.nextOffset == null || loadingMore) return;
    setLoadingMore(true);
    setQueueError(null);
    setQueueNotice(null);

    try {
      const data = await fetchSourceQueue(queueData.source, {
        offset: queueData.tracks.length,
      });
      if (!data) {
        return;
      }
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
  }, [fetchSourceQueue, queueData, loadingMore]);

  const handleDeletePlaylist = useCallback(
    async (item: {
      type: "playlist";
      id: string;
      name: string;
      subtitle: string;
      artworkUrl: string | null;
      meta: {
        totalTracks: number;
        ownerId: string;
        ownerName?: string | null;
        isCollaborative: boolean;
      };
    }) => {
      if (item.meta.ownerId !== spotifyUser?.spotifyId) return;

      const confirmed = window.confirm(
        `Remove "${item.name}" from your Spotify playlists? This will not remove tracks from your library or other playlists.`,
      );
      if (!confirmed) return;

      setDeletingPlaylistId(item.id);
      setQueueError(null);

      try {
        const response = await fetch(`/api/playlists/${item.id}`, {
          method: "DELETE",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
          throw new Error(body?.error || "Failed to delete playlist.");
        }

        setPlaylistRailState(prev =>
          prev
            ? {
                ...prev,
                playlists: prev.playlists.filter(playlist => playlist.id !== item.id),
              }
            : prev,
        );

        if (queueData?.source.type === "playlist" && queueData.source.id === item.id) {
          await handleSelect({ id: "liked-songs", name: "Liked Songs", type: "liked" });
        }

        setQueueNotice(`Removed "${item.name}" from your Spotify playlists.`);
      } catch (error) {
        console.error("Failed to delete playlist:", error);
        setQueueError(error instanceof Error ? error.message : "Failed to delete playlist.");
      } finally {
        setDeletingPlaylistId(null);
      }
    },
    [handleSelect, queueData?.source, redirectToLogin, spotifyUser?.spotifyId],
  );

  const handleRenamePlaylist = useCallback(
    async (item: {
      type: "playlist";
      id: string;
      name: string;
      subtitle: string;
      artworkUrl: string | null;
      meta: {
        totalTracks: number;
        ownerId: string;
        ownerName?: string | null;
        isCollaborative: boolean;
      };
    }) => {
      if (item.meta.ownerId !== spotifyUser?.spotifyId) return;

      const nextName = window.prompt("Rename playlist", item.name)?.trim();
      if (!nextName || nextName === item.name) return;

      setRenamingPlaylistId(item.id);
      setQueueError(null);

      try {
        const response = await fetch(`/api/playlists/${item.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: nextName }),
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
          throw new Error(body?.error || "Failed to rename playlist.");
        }

        setPlaylistRailState(prev =>
          prev
            ? {
                ...prev,
                playlists: prev.playlists.map(playlist =>
                  playlist.id === item.id ? { ...playlist, name: nextName } : playlist,
                ),
              }
            : prev,
        );

        if (queueData?.source.type === "playlist" && queueData.source.id === item.id) {
          setQueueData(prev =>
            prev?.source.type === "playlist" && prev.source.id === item.id
              ? {
                  ...prev,
                  source: {
                    ...prev.source,
                    name: nextName,
                  },
                }
              : prev,
          );
          setSelectedMeta(prev => ({
            ...prev,
            title: nextName,
          }));
        }

        setQueueNotice(`Renamed playlist to "${nextName}".`);
      } catch (error) {
        console.error("Failed to rename playlist:", error);
        setQueueError(error instanceof Error ? error.message : "Failed to rename playlist.");
      } finally {
        setRenamingPlaylistId(null);
      }
    },
    [queueData?.source, redirectToLogin, spotifyUser?.spotifyId],
  );

  const submitConfirm = useCallback(
    async (retryFailures?: ConfirmApiPayload["failures"]) => {
      if (!summaryData?.sessionId) {
        setMode("view");
        setSummaryData(null);
        setReviewSessionKey(key => key + 1);
        router.refresh();
        return;
      }

      setConfirmStatus("idle");
      setConfirmErrorMessage(null);
      setConfirmInProgress(true);
      setConfirmStage(
        retryFailures?.length ? "Retrying failed actions" : "Submitting review actions",
      );
      if (!retryFailures?.length) {
        setConfirmStats(null);
      }

      try {
        const response = await fetch(`/api/review/sessions/${summaryData.sessionId}/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-spotify-id": spotifyUser?.spotifyId ?? "",
          },
          body: JSON.stringify(
            retryFailures?.length
              ? {
                  retryFailures,
                }
              : {},
          ),
        });

        setConfirmStage("Applying Spotify changes");
        const body: ConfirmApiPayload = await response.json().catch(() => ({
          dryRun: false,
          removed: { requested: 0, applied: 0 },
          added: { requested: 0, applied: 0 },
          playlists: { totalTargets: 0, created: 0, skipped: 0 },
          failures: [],
        }));

        setConfirmStats({
          removed: body.removed,
          added: body.added,
          playlists: body.playlists,
        });
        setConfirmFailures(body.failures ?? []);
        await loadConfirmAttempts(summaryData.sessionId);

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            return;
          }
          throw new Error(body?.error || "Failed to confirm review.");
        }

        setConfirmStage("Finalizing session");
        await reconcileCurrentSource(body.removed.applied);
        if (summaryData.playlistAdditions.length > 0) {
          const playlistAdditionMap = new Map(
            summaryData.playlistAdditions.map(entry => [entry.playlistId, entry.count]),
          );
          setPlaylistRailState(prev =>
            prev
              ? {
                  ...prev,
                  playlists: prev.playlists.map(playlist => ({
                    ...playlist,
                    totalTracks: playlist.totalTracks + (playlistAdditionMap.get(playlist.id) ?? 0),
                  })),
                }
              : prev,
          );
        }
        setConfirmStatus("success");
        setConfirmErrorMessage(null);
        setConfirmFailures([]);
        setConfirmInProgress(false);
        setConfirmStage(null);
        setMode("view");
        setSummaryData(null);
        setReviewSessionKey(key => key + 1);
        router.refresh();
      } catch (error) {
        console.error("Failed to confirm review:", error);
        setConfirmStatus("error");
        setConfirmInProgress(false);
        setConfirmStage(null);
        setConfirmErrorMessage(
          error instanceof Error ? error.message : "Failed to confirm review.",
        );
      }
    },
    [
      loadConfirmAttempts,
      reconcileCurrentSource,
      redirectToLogin,
      router,
      spotifyUser?.spotifyId,
      summaryData,
    ],
  );

  useEffect(() => {
    if (mode !== "summary" || !summaryData?.sessionId) {
      setConfirmAttempts([]);
      setConfirmAttemptsLoading(false);
      return;
    }

    void loadConfirmAttempts(summaryData.sessionId);
  }, [loadConfirmAttempts, mode, summaryData?.sessionId]);

  return (
    <div
      className={
        mode === "summary"
          ? "mt-2 flex w-full justify-center lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          : "mt-2 grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[300px_minmax(0,1fr)]"
      }
    >
      {mode !== "summary" && (
        <div className="self-start lg:h-full lg:min-h-0 lg:w-[300px]">
          <PlaylistRailClient
            data={
              sortedPlaylistRailState ?? {
                likedSongs: { total: 0, artwork: null },
                playlists: [],
              }
            }
            appearance="workspace"
            activeId={activeId}
            currentSpotifyUserId={spotifyUser?.spotifyId ?? null}
            onSelect={item => handleSelect({ ...item, name: item.name })}
          />
        </div>
      )}
      <div
        className={
          mode === "summary"
            ? "w-full max-w-6xl"
            : "flex flex-col gap-2 lg:min-h-0 lg:overflow-y-auto"
        }
      >
        {mode === "view" ? (
          <PlaylistViewer
            data={loading ? null : queueData}
            meta={selectedMeta}
            loading={loading}
            error={queueError}
            notice={queueNotice}
            onReview={() => setMode("review")}
            onLoadMore={queueData?.nextOffset != null ? handleLoadMore : undefined}
            loadingMore={loadingMore}
            onRenamePlaylist={
              selectedMeta.sourceType === "playlist" &&
              selectedMeta.canManage &&
              activePlaylistSource
                ? () =>
                    void handleRenamePlaylist({
                      type: "playlist",
                      id: activePlaylistSource.id,
                      name: selectedMeta.title,
                      subtitle: `${selectedMeta.total} tracks`,
                      artworkUrl: selectedMeta.artworkUrl,
                      meta: {
                        totalTracks: selectedMeta.total,
                        ownerId: spotifyUser?.spotifyId ?? "",
                        ownerName: spotifyUser?.displayName ?? null,
                        isCollaborative: false,
                      },
                    })
                : undefined
            }
            onDeletePlaylist={
              selectedMeta.sourceType === "playlist" &&
              selectedMeta.canManage &&
              activePlaylistSource
                ? () =>
                    void handleDeletePlaylist({
                      type: "playlist",
                      id: activePlaylistSource.id,
                      name: selectedMeta.title,
                      subtitle: `${selectedMeta.total} tracks`,
                      artworkUrl: selectedMeta.artworkUrl,
                      meta: {
                        totalTracks: selectedMeta.total,
                        ownerId: spotifyUser?.spotifyId ?? "",
                        ownerName: spotifyUser?.displayName ?? null,
                        isCollaborative: false,
                      },
                    })
                : undefined
            }
            renamingPlaylist={
              renamingPlaylistId ===
              (queueData?.source.type === "playlist" ? queueData.source.id : null)
            }
            deletingPlaylist={
              deletingPlaylistId ===
              (queueData?.source.type === "playlist" ? queueData.source.id : null)
            }
          />
        ) : mode === "review" ? (
          <ReviewStage
            key={reviewSessionKey}
            playlistRailData={sortedPlaylistRailState}
            queueData={loading ? null : queueData}
            loading={loading}
            error={queueError}
            onLoadMore={queueData?.nextOffset != null ? handleLoadMore : undefined}
            loadingMore={loadingMore}
            playlistMeta={{ title: selectedMeta.title, artworkUrl: selectedMeta.artworkUrl }}
            spotifyUser={spotifyUser}
            onFinish={summary => {
              setConfirmAttempts([]);
              setConfirmAttemptsLoading(false);
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
              failedActionCount={confirmFailures?.length ?? 0}
              confirmAttempts={confirmAttempts}
              confirmAttemptsLoading={confirmAttemptsLoading}
              onConfirm={() => void submitConfirm()}
              onRetryFailures={() => void submitConfirm(confirmFailures)}
              onRestart={() => {
                setConfirmInProgress(false);
                setConfirmStage(null);
                setConfirmStats(null);
                setConfirmFailures([]);
                setConfirmAttempts([]);
                setConfirmAttemptsLoading(false);
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
