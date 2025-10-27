import { NextRequest, NextResponse } from "next/server";

import { isDevelopment, spotifyEnv } from "@/lib/env";
import { SPOTIFY_COOKIE_KEYS, SPOTIFY_TOKEN_ENDPOINT } from "@/lib/spotify/auth";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.json({ error: `Spotify authorization error: ${error}` }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing authorization code or state." }, { status: 400 });
  }

  const requestCookies = request.cookies;
  const storedState = requestCookies.get(SPOTIFY_COOKIE_KEYS.oauthState)?.value;
  const codeVerifier = requestCookies.get(SPOTIFY_COOKIE_KEYS.pkceVerifier)?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "State mismatch detected during Spotify authentication." },
      { status: 400 },
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: "Missing PKCE verifier. Please restart the login flow." },
      { status: 400 },
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyEnv.redirectUri(),
      client_id: spotifyEnv.clientId(),
      code_verifier: codeVerifier,
    });

    const clientSecret = spotifyEnv.clientSecret();
    if (clientSecret) {
      body.append("client_secret", clientSecret);
    }

    const tokenResponse = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Spotify token exchange failed:", errorBody);
      return NextResponse.json(
        { error: "Failed to exchange code for Spotify tokens." },
        { status: 400 },
      );
    }

    const { access_token, refresh_token, token_type, scope, expires_in }: SpotifyTokenResponse =
      await tokenResponse.json();

    const expiresAt = Date.now() + expires_in * 1000;

    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set(
      SPOTIFY_COOKIE_KEYS.tokens,
      JSON.stringify({
        accessToken: access_token,
        refreshToken: refresh_token ?? null,
        tokenType: token_type,
        scope,
        expiresAt,
      }),
      {
        httpOnly: true,
        secure: !isDevelopment(),
        sameSite: "lax",
        path: "/",
        maxAge: THIRTY_DAYS_IN_SECONDS,
      },
    );

    response.cookies.delete(SPOTIFY_COOKIE_KEYS.oauthState);
    response.cookies.delete(SPOTIFY_COOKIE_KEYS.pkceVerifier);

    return response;
  } catch (exchangeError) {
    console.error("Unexpected Spotify callback error:", exchangeError);
    return NextResponse.json(
      { error: "Unexpected error during Spotify authentication." },
      { status: 500 },
    );
  }
}
