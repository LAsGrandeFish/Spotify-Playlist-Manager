import { fetchSpotifyLikedTracks, fetchSpotifyPlaylistTracks } from "@/lib/spotify/api";

export type QueueSource =
  | {
      type: "liked";
    }
  | {
      type: "playlist";
      id: string;
      name?: string;
    };

export type QueueTrack = {
  id: string;
  title: string;
  artists: string;
  album: string;
  durationMs: number;
  artworkUrl: string | null;
  addedAt: string;
};

export type QueueData = {
  source: QueueSource;
  tracks: QueueTrack[];
  total: number;
  nextOffset: number | null;
  offset: number;
};

export const fetchQueueData = async (
  accessToken: string,
  source: QueueSource,
  { offset = 0, limit = 50 }: { offset?: number; limit?: number } = {},
): Promise<QueueData> => {
  if (source.type === "liked") {
    const likedTracks = await fetchSpotifyLikedTracks(accessToken, { limit, offset });

    return {
      source,
      tracks: likedTracks.items.map(item => ({
        id: item.track.id,
        title: item.track.name,
        artists: item.track.artists.map(artist => artist.name).join(", "),
        album: item.track.album.name,
        durationMs: item.track.duration_ms,
        artworkUrl: item.track.album.images[0]?.url ?? null,
        addedAt: item.added_at,
      })),
      total: likedTracks.total,
      offset,
      nextOffset: likedTracks.next ? offset + likedTracks.items.length : null,
    };
  }

  const playlistTracks = await fetchSpotifyPlaylistTracks(accessToken, source.id, {
    limit,
    offset,
  });

  return {
    source,
    tracks: playlistTracks.items
      .filter(item => Boolean(item.track))
      .map(item => ({
        id: item.track.id,
        title: item.track.name,
        artists: item.track.artists.map(artist => artist.name).join(", "),
        album: item.track.album.name,
        durationMs: item.track.duration_ms,
        artworkUrl: item.track.album.images[0]?.url ?? null,
        addedAt: item.added_at,
      })),
    total: playlistTracks.total,
    offset,
    nextOffset: playlistTracks.next ? offset + playlistTracks.items.length : null,
  };
};

export const formatDuration = (durationMs: number) => {
  const minutes = Math.floor(durationMs / 1000 / 60);
  const seconds = Math.floor((durationMs / 1000) % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const formatAddedAt = (addedAt: string) => {
  const addedDate = new Date(addedAt);
  const diffMs = Date.now() - addedDate.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};
