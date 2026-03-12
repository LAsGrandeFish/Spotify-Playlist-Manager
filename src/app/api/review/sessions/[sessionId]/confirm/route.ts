import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import {
  addTracksToPlaylist,
  createSpotifyPlaylist,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dryRun =
      searchParams.get("dryRun") === "true" || request.headers.get("x-dry-run") === "true";

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

    if (!dryRun && removedTracks.length > 0) {
      if (session.sourceType === "PLAYLIST" && session.sourceId) {
        const removeUris = removedTracks.map(track => `spotify:track:${track.trackId}`);
        for (const uriChunk of chunk(removeUris, 100)) {
          await removeTracksFromPlaylist(accessToken, session.sourceId, uriChunk);
        }
      } else if (session.sourceType === "LIKED") {
        const removeIds = removedTracks.map(track => track.trackId);
        for (const idChunk of chunk(removeIds, 50)) {
          await removeTracksFromLibrary(accessToken, idChunk);
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
    for (const [playlistId, data] of playlistTargetMap.entries()) {
      if (playlistId.startsWith("local-")) {
        if (dryRun) {
          playlistIdMap.set(playlistId, playlistId);
          continue;
        }
        const created = await createSpotifyPlaylist(accessToken, session.user.spotifyId, {
          name: data.name ?? "New Playlist",
          public: false,
        });
        playlistIdMap.set(playlistId, created.id);
      } else {
        playlistIdMap.set(playlistId, playlistId);
      }
    }

    for (const [originalId, data] of playlistTargetMap.entries()) {
      const resolvedId = playlistIdMap.get(originalId);
      if (!resolvedId) continue;
      const trackUris = Array.from(data.trackIds).map(trackId => `spotify:track:${trackId}`);
      if (!dryRun) {
        for (const uriChunk of chunk(trackUris, 100)) {
          await addTracksToPlaylist(accessToken, resolvedId, uriChunk);
        }
      }
    }

    if (!dryRun) {
      await prisma.reviewSession.update({
        where: { id: sessionId },
        data: { status: "CONFIRMED" },
      });
    }

    const response = NextResponse.json({
      removed: removedTracks.length,
      addedPlaylists: Array.from(playlistIdMap.values()).length,
      dryRun,
    });
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    console.error("Failed to confirm review session:", error);
    return NextResponse.json({ error: "Failed to apply Spotify changes." }, { status: 500 });
  }
}
