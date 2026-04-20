import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import {
  addTracksToPlaylist,
  createSpotifyPlaylist,
  fetchSpotifyPlaylistTracks,
  removeTracksFromLibrary,
  removeTracksFromPlaylist,
} from "@/lib/spotify/api";
import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
} from "@/lib/spotify/session";

export const runtime = "nodejs";

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchPlaylistTrackIds = async (accessToken: string, playlistId: string) => {
  const ids = new Set<string>();
  let offset = 0;
  const limit = 100;
  const maxTracks = 5000;

  while (true) {
    const page = await fetchSpotifyPlaylistTracks(accessToken, playlistId, { limit, offset });
    page.items.forEach(item => {
      if (item.track?.id) {
        ids.add(item.track.id);
      }
    });

    if (!page.next || ids.size >= maxTracks) {
      break;
    }

    offset += page.items.length;
  }

  return ids;
};

type ConfirmFailure = {
  stage: "remove" | "create-playlist" | "add";
  targetId?: string;
  originalTargetId?: string;
  chunkSize?: number;
  trackIds?: string[];
  playlistName?: string | null;
  message: string;
};

type ConfirmRequestBody = {
  retryFailures?: ConfirmFailure[];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  let confirmAttemptId: string | null = null;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dryRun =
      searchParams.get("dryRun") === "true" || request.headers.get("x-dry-run") === "true";
    const requestBody = (await request.json().catch(() => ({}))) as ConfirmRequestBody;
    const retryFailures = Array.isArray(requestBody.retryFailures)
      ? requestBody.retryFailures
      : null;

    const spotifyId = request.headers.get("x-spotify-id");
    if (!spotifyId) {
      return NextResponse.json({ error: "Missing user context." }, { status: 400 });
    }

    const session = await prisma.reviewSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        tracks: {
          include: {
            addTargets: true,
          },
        },
      },
    });

    if (!session || session.user.spotifyId !== spotifyId) {
      return NextResponse.json({ error: "Unauthorized session access." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SPOTIFY_COOKIE_KEYS.tokens)?.value;
    const parsedToken = parseSpotifyTokenPayload(rawToken);
    if (!parsedToken) {
      return NextResponse.json({ error: "Not authenticated with Spotify." }, { status: 401 });
    }
    const refreshedTokens = await ensureSpotifyTokens(parsedToken);
    if (!refreshedTokens) {
      const response = NextResponse.json({ error: "Spotify session expired." }, { status: 401 });
      clearSpotifyTokenCookie(response);
      return response;
    }

    const accessToken = refreshedTokens.accessToken;
    const removedTracks = session.tracks.filter(track => track.action === "REMOVE");
    const failures: ConfirmFailure[] = [];
    let removedRequested = 0;
    let removedApplied = 0;
    let addedRequested = 0;
    let addedApplied = 0;
    let createdPlaylists = 0;
    let skippedPlaylists = 0;

    const retryRemoveFailures = retryFailures?.filter(failure => failure.stage === "remove") ?? [];
    const retryCreateFailures =
      retryFailures?.filter(failure => failure.stage === "create-playlist") ?? [];
    const retryAddFailures = retryFailures?.filter(failure => failure.stage === "add") ?? [];

    const startedAttempt = await prisma.reviewConfirmAttempt.create({
      data: {
        sessionId,
        status: "STARTED",
        dryRun,
      },
    });
    confirmAttemptId = startedAttempt.id;

    if (retryFailures) {
      if (session.sourceType === "PLAYLIST" && session.sourceId) {
        for (const failure of retryRemoveFailures) {
          const trackIds = failure.trackIds ?? [];
          const removeUris = trackIds.map(trackId => `spotify:track:${trackId}`);
          for (const uriChunk of chunk(removeUris, 100)) {
            removedRequested += uriChunk.length;
            try {
              if (!dryRun) {
                await removeTracksFromPlaylist(accessToken, session.sourceId, uriChunk);
              }
              removedApplied += uriChunk.length;
            } catch (error) {
              failures.push({
                stage: "remove",
                targetId: session.sourceId,
                chunkSize: uriChunk.length,
                trackIds: uriChunk.map(uri => uri.replace("spotify:track:", "")),
                message: error instanceof Error ? error.message : "Failed to remove chunk.",
              });
            }
          }
        }
      } else if (session.sourceType === "LIKED") {
        for (const failure of retryRemoveFailures) {
          const trackIds = failure.trackIds ?? [];
          for (const idChunk of chunk(trackIds, 50)) {
            removedRequested += idChunk.length;
            try {
              if (!dryRun) {
                await removeTracksFromLibrary(accessToken, idChunk);
              }
              removedApplied += idChunk.length;
            } catch (error) {
              failures.push({
                stage: "remove",
                targetId: "liked",
                chunkSize: idChunk.length,
                trackIds: idChunk,
                message: error instanceof Error ? error.message : "Failed to remove liked chunk.",
              });
            }
          }
        }
      }
    } else if (!dryRun && removedTracks.length > 0) {
      if (session.sourceType === "PLAYLIST" && session.sourceId) {
        const removeUris = removedTracks.map(track => `spotify:track:${track.trackId}`);
        for (const uriChunk of chunk(removeUris, 100)) {
          removedRequested += uriChunk.length;
          try {
            await removeTracksFromPlaylist(accessToken, session.sourceId, uriChunk);
            removedApplied += uriChunk.length;
          } catch (error) {
            failures.push({
              stage: "remove",
              targetId: session.sourceId,
              chunkSize: uriChunk.length,
              trackIds: uriChunk.map(uri => uri.replace("spotify:track:", "")),
              message: error instanceof Error ? error.message : "Failed to remove chunk.",
            });
          }
        }
      } else if (session.sourceType === "LIKED") {
        const removeIds = removedTracks.map(track => track.trackId);
        for (const idChunk of chunk(removeIds, 50)) {
          removedRequested += idChunk.length;
          try {
            await removeTracksFromLibrary(accessToken, idChunk);
            removedApplied += idChunk.length;
          } catch (error) {
            failures.push({
              stage: "remove",
              targetId: "liked",
              chunkSize: idChunk.length,
              trackIds: idChunk,
              message: error instanceof Error ? error.message : "Failed to remove liked chunk.",
            });
          }
        }
      }
    }

    const playlistTargetMap = new Map<string, { name?: string | null; trackIds: Set<string> }>();

    session.tracks.forEach(track => {
      track.addTargets.forEach(target => {
        const entry = playlistTargetMap.get(target.playlistId) ?? {
          name: target.playlistName ?? null,
          trackIds: new Set<string>(),
        };
        entry.trackIds.add(track.trackId);
        playlistTargetMap.set(target.playlistId, entry);
      });
    });

    const playlistIdMap = new Map<string, string>();
    const retryLocalAddOperations: Array<{ playlistId: string; trackIds: string[] }> = [];
    for (const [playlistId, data] of playlistTargetMap.entries()) {
      if (retryFailures && !retryCreateFailures.some(failure => failure.targetId === playlistId)) {
        if (!playlistId.startsWith("local-")) {
          playlistIdMap.set(playlistId, playlistId);
        }
        continue;
      }

      if (playlistId.startsWith("local-")) {
        if (dryRun) {
          playlistIdMap.set(playlistId, playlistId);
          retryLocalAddOperations.push({
            playlistId,
            trackIds: Array.from(data.trackIds),
          });
          continue;
        }
        try {
          const created = await createSpotifyPlaylist(accessToken, session.user.spotifyId, {
            name: data.name ?? "New Playlist",
            public: false,
          });
          createdPlaylists += 1;
          playlistIdMap.set(playlistId, created.id);
          retryLocalAddOperations.push({
            playlistId: created.id,
            trackIds: Array.from(data.trackIds),
          });
        } catch (error) {
          skippedPlaylists += 1;
          failures.push({
            stage: "create-playlist",
            targetId: playlistId,
            playlistName: data.name ?? "New Playlist",
            message: error instanceof Error ? error.message : "Failed to create playlist.",
          });
        }
      } else if (!retryFailures) {
        playlistIdMap.set(playlistId, playlistId);
      }
    }

    const addOperations: Array<{
      playlistId: string;
      originalTargetId?: string;
      trackIds: string[];
    }> = [];

    if (retryFailures) {
      retryAddFailures.forEach(failure => {
        if (failure.targetId && failure.trackIds?.length) {
          addOperations.push({
            playlistId: failure.targetId,
            originalTargetId: failure.originalTargetId,
            trackIds: failure.trackIds,
          });
        }
      });

      retryLocalAddOperations.forEach(operation => {
        addOperations.push({
          playlistId: operation.playlistId,
          trackIds: operation.trackIds,
        });
      });
    } else {
      for (const [originalId, data] of playlistTargetMap.entries()) {
        const resolvedId = playlistIdMap.get(originalId);
        if (!resolvedId) continue;
        addOperations.push({
          playlistId: resolvedId,
          originalTargetId: originalId,
          trackIds: Array.from(data.trackIds),
        });
      }
    }

    for (const operation of addOperations) {
      let trackIdsToAdd = operation.trackIds;
      if (!dryRun) {
        try {
          const existingTrackIds = await fetchPlaylistTrackIds(accessToken, operation.playlistId);
          trackIdsToAdd = operation.trackIds.filter(trackId => !existingTrackIds.has(trackId));
        } catch (error) {
          failures.push({
            stage: "add",
            targetId: operation.playlistId,
            originalTargetId: operation.originalTargetId,
            trackIds: operation.trackIds,
            message:
              error instanceof Error
                ? error.message
                : "Failed to verify target playlist tracks before add.",
          });
          continue;
        }
      }

      if (trackIdsToAdd.length === 0) {
        continue;
      }

      const trackUris = trackIdsToAdd.map(trackId => `spotify:track:${trackId}`);
      addedRequested += trackUris.length;
      if (!dryRun) {
        for (const uriChunk of chunk(trackUris, 100)) {
          try {
            await addTracksToPlaylist(accessToken, operation.playlistId, uriChunk);
            addedApplied += uriChunk.length;
          } catch (error) {
            failures.push({
              stage: "add",
              targetId: operation.playlistId,
              originalTargetId: operation.originalTargetId,
              chunkSize: uriChunk.length,
              trackIds: uriChunk.map(uri => uri.replace("spotify:track:", "")),
              message: error instanceof Error ? error.message : "Failed to add chunk.",
            });
          }
        }
      } else {
        addedApplied += trackUris.length;
      }
    }

    if (!dryRun && failures.length === 0) {
      await prisma.reviewSession.update({
        where: { id: sessionId },
        data: { status: "CONFIRMED" },
      });
    }

    const result = {
      attemptId: confirmAttemptId,
      dryRun,
      removed: {
        requested: dryRun ? removedTracks.length : removedRequested,
        applied: dryRun ? removedTracks.length : removedApplied,
      },
      added: {
        requested: addedRequested,
        applied: addedApplied,
      },
      playlists: {
        totalTargets: playlistTargetMap.size,
        created: createdPlaylists,
        skipped: skippedPlaylists,
      },
      failures,
      status: failures.length === 0 ? "success" : "partial_failure",
    } as const;

    await prisma.reviewConfirmAttempt.update({
      where: { id: confirmAttemptId },
      data: {
        status: failures.length === 0 ? "SUCCESS" : "PARTIAL_FAILURE",
        removedRequested: result.removed.requested,
        removedApplied: result.removed.applied,
        addedRequested: result.added.requested,
        addedApplied: result.added.applied,
        totalTargets: result.playlists.totalTargets,
        playlistsCreated: result.playlists.created,
        playlistsSkipped: result.playlists.skipped,
        failureCount: failures.length,
        failureLog: failures.length > 0 ? JSON.stringify(failures) : null,
        errorMessage: failures.length > 0 ? "Some Spotify changes failed. See failure log." : null,
      },
    });

    const response =
      failures.length === 0
        ? NextResponse.json(result)
        : NextResponse.json(
            { error: "Some Spotify changes failed. See details and retry.", ...result },
            { status: 500 },
          );
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply Spotify changes.";
    if (confirmAttemptId) {
      await prisma.reviewConfirmAttempt.update({
        where: { id: confirmAttemptId },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      });
    }
    console.error("Failed to confirm review session:", error);
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
