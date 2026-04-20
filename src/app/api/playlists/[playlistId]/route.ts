import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { unfollowPlaylist } from "@/lib/spotify/api";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
} from "@/lib/spotify/session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { playlistId } = await params;

    if (!playlistId) {
      return NextResponse.json({ error: "Missing playlist id." }, { status: 400 });
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

    const requiredScopes = ["playlist-modify-private", "playlist-modify-public"];
    const grantedScopes = new Set(refreshedTokens.scope?.split(" ").filter(Boolean));

    if (!requiredScopes.some(scope => grantedScopes.has(scope))) {
      return NextResponse.json(
        {
          error: "Missing playlist modification scope.",
          missingScopes: requiredScopes,
          grantedScopes: Array.from(grantedScopes),
        },
        { status: 403 },
      );
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
