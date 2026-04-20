import {
  SpotifyImage,
  SpotifyPlaylist,
  fetchSpotifyLikedTracksPreview,
  fetchSpotifyUserPlaylists,
} from "@/lib/spotify/api";

export type PlaylistSummary = {
  id: string;
  name: string;
  totalTracks: number;
  images: SpotifyImage[];
  ownerId: string;
  ownerName?: string | null;
  isCollaborative: boolean;
  isPublic: boolean;
};

export type LikedSongsSummary = {
  total: number;
  artwork: SpotifyImage | null;
};

export type PlaylistRailData = {
  likedSongs: LikedSongsSummary;
  playlists: PlaylistSummary[];
};

const mapPlaylistToSummary = (playlist: SpotifyPlaylist): PlaylistSummary => ({
  id: playlist.id,
  name: playlist.name,
  totalTracks: playlist.tracks.total,
  images: playlist.images,
  ownerId: playlist.owner.id,
  ownerName: playlist.owner.display_name,
  isCollaborative: playlist.collaborative,
  isPublic: playlist.public,
});

export const fetchPlaylistRailData = async (accessToken: string): Promise<PlaylistRailData> => {
  const playlists: PlaylistSummary[] = [];
  let offset = 0;
  const pageSize = 50;

  // Page through all playlists (safety cap to avoid runaway loops)
  while (true) {
    const page = await fetchSpotifyUserPlaylists(accessToken, { limit: pageSize, offset });
    playlists.push(...page.items.map(mapPlaylistToSummary));
    if (!page.next) break;
    offset += page.items.length;
    if (offset > 2000) break;
  }

  const likedSongs = await fetchSpotifyLikedTracksPreview(accessToken);

  return {
    likedSongs,
    playlists,
  };
};
