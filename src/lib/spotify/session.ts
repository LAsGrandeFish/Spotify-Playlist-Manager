import { spotifyEnv } from "@/lib/env";
import { SPOTIFY_COOKIE_KEYS, SPOTIFY_TOKEN_ENDPOINT } from "@/lib/spotify/auth";

export const TOKEN_REFRESH_BUFFER_MS = 60_000; // 1 minute

export type SpotifyTokenPayload = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string;
  expiresAt: number;
};

type SpotifyRefreshResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

export const parseSpotifyTokenPayload = (
  rawValue: string | undefined | null,
): SpotifyTokenPayload | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as SpotifyTokenPayload;
    if (!parsed || typeof parsed.accessToken !== "string" || typeof parsed.expiresAt !== "number") {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      tokenType: parsed.tokenType ?? "Bearer",
      scope: parsed.scope ?? "",
      expiresAt: parsed.expiresAt,
    };
  } catch (error) {
    console.warn("Failed to parse Spotify token payload:", error);
    return null;
  }
};

export const serializeSpotifyTokenPayload = (payload: SpotifyTokenPayload): string =>
  JSON.stringify(payload);

export const calculateSpotifyExpiryTimestamp = (expiresInSeconds: number) =>
  Date.now() + expiresInSeconds * 1000;

export const isSpotifyTokenExpired = (expiresAt: number) =>
  Date.now() + TOKEN_REFRESH_BUFFER_MS >= expiresAt;

export const refreshSpotifyAccessToken = async (
  currentTokens: SpotifyTokenPayload,
): Promise<SpotifyTokenPayload> => {
  if (!currentTokens.refreshToken) {
    throw new Error("Missing Spotify refresh token. Ask the user to sign in again.");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentTokens.refreshToken,
    client_id: spotifyEnv.clientId(),
  });

  const clientSecret = spotifyEnv.clientSecret();
  if (clientSecret) {
    params.append("client_secret", clientSecret);
  }

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Spotify token. Status ${response.status}: ${errorBody}`);
  }

  const { access_token, expires_in, token_type, scope, refresh_token }: SpotifyRefreshResponse =
    await response.json();

  return {
    accessToken: access_token,
    refreshToken: refresh_token ?? currentTokens.refreshToken,
    tokenType: token_type ?? currentTokens.tokenType,
    scope: scope ?? currentTokens.scope,
    expiresAt: calculateSpotifyExpiryTimestamp(expires_in),
  };
};

export const getSpotifyTokenCookieName = () => SPOTIFY_COOKIE_KEYS.tokens;

export const ensureSpotifyTokens = async (
  tokens: SpotifyTokenPayload | null,
): Promise<SpotifyTokenPayload | null> => {
  if (!tokens) {
    return null;
  }

  if (!isSpotifyTokenExpired(tokens.expiresAt)) {
    return tokens;
  }

  try {
    return await refreshSpotifyAccessToken(tokens);
  } catch (error) {
    console.error("Failed to refresh Spotify tokens:", error);
    return null;
  }
};
