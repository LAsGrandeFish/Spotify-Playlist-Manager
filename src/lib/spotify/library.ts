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
  ownerName: playlist.owner.display_name,
  isCollaborative: playlist.collaborative,
  isPublic: playlist.public,
});

export const fetchPlaylistRailData = async (accessToken: string): Promise<PlaylistRailData> => {
  const [playlistsResponse, likedSongs] = await Promise.all([
    fetchSpotifyUserPlaylists(accessToken, { limit: 50 }),
    fetchSpotifyLikedTracksPreview(accessToken),
  ]);

  const playlists = playlistsResponse.items.map(mapPlaylistToSummary);

  return {
    likedSongs,
    playlists,
  };
};
