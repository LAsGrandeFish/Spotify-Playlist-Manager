import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { isDevelopment } from "@/lib/env";
import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import {
  SPOTIFY_SESSION_MAX_AGE_SECONDS,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  serializeSpotifyTokenPayload,
} from "@/lib/spotify/session";

export async function GET() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SPOTIFY_COOKIE_KEYS.tokens)?.value;
  const parsedToken = parseSpotifyTokenPayload(rawToken);

  if (!parsedToken) {
    return NextResponse.json({ error: "Not authenticated with Spotify." }, { status: 401 });
  }

  const refreshedTokens = await ensureSpotifyTokens(parsedToken);
  if (!refreshedTokens) {
    return NextResponse.json({ error: "Spotify session expired." }, { status: 401 });
  }

  const response = NextResponse.json({
    accessToken: refreshedTokens.accessToken,
    expiresAt: refreshedTokens.expiresAt,
  });

  response.cookies.set(SPOTIFY_COOKIE_KEYS.tokens, serializeSpotifyTokenPayload(refreshedTokens), {
    httpOnly: true,
    secure: !isDevelopment(),
    sameSite: "lax",
    path: "/",
    maxAge: SPOTIFY_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
