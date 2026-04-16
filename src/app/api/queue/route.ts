import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { fetchQueueData, type QueueSource } from "@/lib/spotify/queue";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
} from "@/lib/spotify/session";

export async function POST(request: NextRequest) {
  try {
    const { source, offset, limit } = (await request.json()) as {
      source?: QueueSource;
      offset?: number;
      limit?: number;
    };

    if (!source || (source.type === "playlist" && !source.id)) {
      return NextResponse.json({ error: "Missing or invalid queue source." }, { status: 400 });
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

    const data = await fetchQueueData(refreshedTokens.accessToken, source, { offset, limit });
    const response = NextResponse.json(data);
    setSpotifyTokenCookie(response, refreshedTokens);
    return response;
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json({ error: "Failed to load queue." }, { status: 500 });
  }
}
