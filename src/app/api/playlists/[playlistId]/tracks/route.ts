import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { fetchSpotifyPlaylistTracks } from "@/lib/spotify/api";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
} from "@/lib/spotify/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
): Promise<NextResponse> {
  const { playlistId } = await params;
  if (!playlistId) {
    return NextResponse.json({ error: "Missing playlist id." }, { status: 400 });
  }

  try {
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

    const ids: string[] = [];
    let offset = 0;
    const limit = 100;
    // safety cap to avoid runaway loops
    const MAX_TRACKS = 5000;

    while (true) {
      const page = await fetchSpotifyPlaylistTracks(refreshedTokens.accessToken, playlistId, {
        limit,
        offset,
      });
      const pageIds = page.items.filter(item => Boolean(item.track?.id)).map(item => item.track.id);
      ids.push(...pageIds);

      if (!page.next || ids.length >= MAX_TRACKS) {
        break;
      }
      offset += page.items.length;
    }

    const response = NextResponse.json({ ids: ids.slice(0, MAX_TRACKS) });
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    console.error("Failed to fetch playlist track ids:", error);
    return NextResponse.json({ error: "Failed to fetch playlist tracks." }, { status: 500 });
  }
}
