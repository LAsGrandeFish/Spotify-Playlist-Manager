import { spotifyEnv } from "@/lib/env";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export type SpotifyCurrentUser = {
  id: string;
  display_name: string | null;
  email?: string;
  images?: Array<{ url: string; width?: number; height?: number }>;
  product?: string;
  country?: string;
};

const withAccessToken = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  "Client-ID": spotifyEnv.clientId(),
});

export const fetchSpotifyCurrentUser = async (accessToken: string): Promise<SpotifyCurrentUser> => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me`, {
    headers: withAccessToken(accessToken),
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Spotify access token expired or revoked.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch Spotify profile. Status ${response.status}: ${errorBody}`);
  }

  return response.json();
};
