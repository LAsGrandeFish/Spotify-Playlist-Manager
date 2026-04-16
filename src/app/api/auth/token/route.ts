import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import {
  clearSpotifyTokenCookie,
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  setSpotifyTokenCookie,
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
    const response = NextResponse.json({ error: "Spotify session expired." }, { status: 401 });
    clearSpotifyTokenCookie(response);
    return response;
  }

  const requiredScopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
  ];
  const grantedScopes = new Set(refreshedTokens.scope?.split(" ").filter(Boolean));
  const missingScopes = requiredScopes.filter(scope => !grantedScopes.has(scope));

  if (missingScopes.length > 0) {
    return NextResponse.json(
      {
        error: "Missing required Spotify scopes.",
        missingScopes,
        grantedScopes: Array.from(grantedScopes),
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    accessToken: refreshedTokens.accessToken,
    expiresAt: refreshedTokens.expiresAt,
    scopes: Array.from(grantedScopes),
  });
  setSpotifyTokenCookie(response, refreshedTokens);

  return response;
}
