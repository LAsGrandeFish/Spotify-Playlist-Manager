import { NextRequest, NextResponse } from "next/server";

import { isDevelopment } from "@/lib/env";
import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";

const baseCookieOptions = {
  httpOnly: true,
  secure: !isDevelopment(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(SPOTIFY_COOKIE_KEYS.tokens, "", {
    ...baseCookieOptions,
  });

  response.cookies.delete(SPOTIFY_COOKIE_KEYS.oauthState);
  response.cookies.delete(SPOTIFY_COOKIE_KEYS.pkceVerifier);

  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(SPOTIFY_COOKIE_KEYS.tokens, "", {
    ...baseCookieOptions,
  });

  response.cookies.delete(SPOTIFY_COOKIE_KEYS.oauthState);
  response.cookies.delete(SPOTIFY_COOKIE_KEYS.pkceVerifier);

  return response;
}
