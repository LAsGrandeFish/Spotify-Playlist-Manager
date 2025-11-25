import { NextResponse } from "next/server";

import { isDevelopment, spotifyEnv } from "@/lib/env";
import {
  SPOTIFY_COOKIE_KEYS,
  buildSpotifyAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOauthState,
} from "@/lib/spotify/auth";

const TEN_MINUTES_IN_SECONDS = 60 * 10;

export async function GET(): Promise<NextResponse> {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateOauthState();

    const authorizeUrl = buildSpotifyAuthorizeUrl({
      clientId: spotifyEnv.clientId(),
      redirectUri: spotifyEnv.redirectUri(),
      codeChallenge,
      state,
      showDialog: false,
    });

    const response = NextResponse.redirect(authorizeUrl, { status: 302 });
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: !isDevelopment(),
      maxAge: TEN_MINUTES_IN_SECONDS,
    };

    response.cookies.set(SPOTIFY_COOKIE_KEYS.pkceVerifier, codeVerifier, cookieOptions);
    response.cookies.set(SPOTIFY_COOKIE_KEYS.oauthState, state, cookieOptions);

    return response;
  } catch (error) {
    console.error("Failed to initialize Spotify login:", error);
    return NextResponse.json(
      { error: "Unable to initiate Spotify authorization flow." },
      { status: 500 },
    );
  }
}
