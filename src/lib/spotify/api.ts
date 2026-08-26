import { spotifyEnv } from "@/lib/env";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export type SpotifyImage = {
  url: string;
  width?: number;
  height?: number;
};

export type SpotifyCurrentUser = {
  id: string;
  display_name: string | null;
  email?: string;
  images?: SpotifyImage[];
  product?: string;
  country?: string;
};

export type SpotifyPaginatedResponse<T> = {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description?: string | null;
  images: SpotifyImage[] | null;
  tracks: {
    total: number;
  };
  owner: {
    id: string;
    display_name?: string | null;
  };
  public: boolean;
  collaborative: boolean;
};

export type SpotifyTrackArtist = {
  id: string;
  name: string;
};

export type SpotifyTrackAlbum = {
  id: string;
  name: string;
  images: SpotifyImage[];
};

export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  preview_url?: string | null;
  duration_ms: number;
  artists: SpotifyTrackArtist[];
  album: SpotifyTrackAlbum;
};

export type SpotifySavedTrack = {
  added_at: string;
  track: SpotifyTrack;
};

export type SpotifyPlaylistTrackItem = {
  added_at: string;
  track: SpotifyTrack;
};

const withAccessToken = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  "Client-ID": spotifyEnv.clientId(),
});

const handleSpotifyResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    throw new Error("Spotify access token expired or revoked.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
};

export const fetchSpotifyCurrentUser = async (accessToken: string): Promise<SpotifyCurrentUser> => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me`, {
    headers: withAccessToken(accessToken),
    cache: "no-store",
  });

  return handleSpotifyResponse<SpotifyCurrentUser>(response);
};

export const fetchSpotifyUserPlaylists = async (
  accessToken: string,
  { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<SpotifyPaginatedResponse<SpotifyPlaylist>> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me/playlists?${params.toString()}`, {
    headers: withAccessToken(accessToken),
    cache: "no-store",
  });

  return handleSpotifyResponse<SpotifyPaginatedResponse<SpotifyPlaylist>>(response);
};

export type SpotifyLikedTracksPreview = {
  total: number;
  artwork: SpotifyImage | null;
};

export const fetchSpotifyLikedTracksPreview = async (
  accessToken: string,
): Promise<SpotifyLikedTracksPreview> => {
  const params = new URLSearchParams({
    limit: "1",
  });

  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me/tracks?${params.toString()}`, {
    headers: withAccessToken(accessToken),
    cache: "no-store",
  });

  const data = await handleSpotifyResponse<SpotifyPaginatedResponse<SpotifySavedTrack>>(response);
  const artwork = data.items[0]?.track.album.images?.[0] ?? null;

  return {
    total: data.total,
    artwork,
  };
};

export const fetchSpotifyLikedTracks = async (
  accessToken: string,
  { limit = 25, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<SpotifyPaginatedResponse<SpotifySavedTrack>> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me/tracks?${params.toString()}`, {
    headers: withAccessToken(accessToken),
    cache: "no-store",
  });

  return handleSpotifyResponse<SpotifyPaginatedResponse<SpotifySavedTrack>>(response);
};

export const fetchSpotifyPlaylistTracks = async (
  accessToken: string,
  playlistId: string,
  { limit = 25, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<SpotifyPaginatedResponse<SpotifyPlaylistTrackItem>> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks?${params.toString()}`,
    {
      headers: withAccessToken(accessToken),
      cache: "no-store",
    },
  );

  return handleSpotifyResponse<SpotifyPaginatedResponse<SpotifyPlaylistTrackItem>>(response);
};

export type SpotifyCreatePlaylistPayload = {
  name: string;
  description?: string | null;
  public?: boolean;
};

export const createSpotifyPlaylist = async (
  accessToken: string,
  userId: string,
  payload: SpotifyCreatePlaylistPayload,
): Promise<SpotifyPlaylist> => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/users/${userId}/playlists`, {
    method: "POST",
    headers: withAccessToken(accessToken),
    body: JSON.stringify({
      name: payload.name,
      description: payload.description ?? null,
      public: payload.public ?? false,
    }),
  });

  return handleSpotifyResponse<SpotifyPlaylist>(response);
};

export const addTracksToPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackUris: string[],
) => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: withAccessToken(accessToken),
    body: JSON.stringify({
      uris: trackUris,
    }),
  });

  return handleSpotifyResponse<{ snapshot_id: string }>(response);
};

export const removeTracksFromPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackUris: string[],
) => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
    method: "DELETE",
    headers: withAccessToken(accessToken),
    body: JSON.stringify({
      tracks: trackUris.map(uri => ({ uri })),
    }),
  });

  return handleSpotifyResponse<{ snapshot_id: string }>(response);
};

export const removeTracksFromLibrary = async (accessToken: string, trackIds: string[]) => {
  const params = new URLSearchParams({
    ids: trackIds.join(","),
  });

  const response = await fetch(`${SPOTIFY_API_BASE_URL}/me/tracks?${params.toString()}`, {
    method: "DELETE",
    headers: withAccessToken(accessToken),
  });

  if (response.status === 401) {
    throw new Error("Spotify access token expired or revoked.");
  }
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${errorBody}`);
  }
};

export const unfollowPlaylist = async (accessToken: string, playlistId: string) => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/followers`, {
    method: "DELETE",
    headers: withAccessToken(accessToken),
  });

  if (response.status === 401) {
    throw new Error("Spotify access token expired or revoked.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${errorBody}`);
  }
};

export const updatePlaylistDetails = async (
  accessToken: string,
  playlistId: string,
  payload: {
    name?: string;
    description?: string | null;
    public?: boolean;
    collaborative?: boolean;
  },
) => {
  const response = await fetch(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}`, {
    method: "PUT",
    headers: withAccessToken(accessToken),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error("Spotify access token expired or revoked.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${errorBody}`);
  }
};
