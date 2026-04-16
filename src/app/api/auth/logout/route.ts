import { NextResponse } from "next/server";

import { isDevelopment, spotifyEnv } from "@/lib/env";
import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";

const baseCookieOptions = {
  httpOnly: true,
  secure: !isDevelopment(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", spotifyEnv.redirectUri()));

  response.cookies.set(SPOTIFY_COOKIE_KEYS.tokens, "", {
    ...baseCookieOptions,
  });

  response.cookies.delete(SPOTIFY_COOKIE_KEYS.oauthState);
  response.cookies.delete(SPOTIFY_COOKIE_KEYS.pkceVerifier);

  return response;
}

export async function GET(): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", spotifyEnv.redirectUri()));

  response.cookies.set(SPOTIFY_COOKIE_KEYS.tokens, "", {
    ...baseCookieOptions,
  });

  response.cookies.delete(SPOTIFY_COOKIE_KEYS.oauthState);
  response.cookies.delete(SPOTIFY_COOKIE_KEYS.pkceVerifier);

  return response;
}
