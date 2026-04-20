import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { unfollowPlaylist, updatePlaylistDetails } from "@/lib/spotify/api";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
} from "@/lib/spotify/session";

const getRefreshedSpotifyTokens = async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SPOTIFY_COOKIE_KEYS.tokens)?.value;
  const parsedToken = parseSpotifyTokenPayload(rawToken);

  if (!parsedToken) {
    return {
      error: NextResponse.json({ error: "Not authenticated with Spotify." }, { status: 401 }),
      refreshedTokens: null,
    };
  }

  const refreshedTokens = await ensureSpotifyTokens(parsedToken);
  if (!refreshedTokens) {
    const response = NextResponse.json({ error: "Spotify session expired." }, { status: 401 });
    clearSpotifyTokenCookie(response);
    return {
      error: response,
      refreshedTokens: null,
    };
  }

  const requiredScopes = ["playlist-modify-private", "playlist-modify-public"];
  const grantedScopes = new Set(refreshedTokens.scope?.split(" ").filter(Boolean));

  if (!requiredScopes.some(scope => grantedScopes.has(scope))) {
    return {
      error: NextResponse.json(
        {
          error: "Missing playlist modification scope.",
          missingScopes: requiredScopes,
          grantedScopes: Array.from(grantedScopes),
        },
        { status: 403 },
      ),
      refreshedTokens: null,
    };
  }

  return {
    error: null,
    refreshedTokens,
  };
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { playlistId } = await params;
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const nextName = body.name?.trim();

    if (!playlistId) {
      return NextResponse.json({ error: "Missing playlist id." }, { status: 400 });
    }

    if (!nextName) {
      return NextResponse.json({ error: "Playlist name is required." }, { status: 400 });
    }

    const { error, refreshedTokens } = await getRefreshedSpotifyTokens();
    if (error || !refreshedTokens) {
      return error;
    }

    await updatePlaylistDetails(refreshedTokens.accessToken, playlistId, { name: nextName });

    const response = NextResponse.json({ success: true, name: nextName });
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    console.error("Playlist rename API error:", error);
    return NextResponse.json({ error: "Failed to rename playlist." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { playlistId } = await params;

    if (!playlistId) {
      return NextResponse.json({ error: "Missing playlist id." }, { status: 400 });
    }

    const { error, refreshedTokens } = await getRefreshedSpotifyTokens();
    if (error || !refreshedTokens) {
      return error;
    }

    await unfollowPlaylist(refreshedTokens.accessToken, playlistId);

    const response = NextResponse.json({ success: true });
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    console.error("Playlist delete API error:", error);
    return NextResponse.json({ error: "Failed to delete playlist." }, { status: 500 });
  }
}
