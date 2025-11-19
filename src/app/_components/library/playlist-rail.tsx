import Link from "next/link";

import PlaylistRailClient from "@/app/_components/library/playlist-rail-client";
import type { PlaylistRailData } from "@/lib/spotify/library";

type PlaylistRailProps = {
  data: PlaylistRailData | null;
  isAuthenticated: boolean;
  error?: string | null;
  appearance?: "workspace" | "card";
};

export default function PlaylistRail({
  data,
  isAuthenticated,
  error,
  appearance = "card",
}: PlaylistRailProps) {
  const isWorkspace = appearance === "workspace";
  const workspaceClasses = "rounded-3xl border border-[#1e1e1e] bg-[#111111] p-4 text-zinc-200";
  const cardClasses =
    "rounded-2xl border border-zinc-200 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300";

  if (!isAuthenticated) {
    return (
      <div className={isWorkspace ? workspaceClasses : cardClasses}>
        <p className="font-semibold text-zinc-50">Connect Spotify to load library.</p>
        <p className="mt-2 text-xs text-zinc-400">
          Once logged in, your playlists and liked songs appear here for quick keyboard navigation.
        </p>
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
          href="/api/auth/login"
        >
          Log in with Spotify
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={isWorkspace ? workspaceClasses : cardClasses}>
        <p className="font-semibold text-zinc-50">Loading playlists…</p>
        {error ? (
          <p className="mt-2 text-xs text-amber-400">{error} Try logging out and back in.</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">Fetching your playlists and liked songs.</p>
        )}
      </div>
    );
  }

  return <PlaylistRailClient data={data} appearance={appearance} />;
}
