import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import WorkspaceShell from "@/app/_components/workspace/workspace-shell";
import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { fetchSpotifyCurrentUser, type SpotifyCurrentUser } from "@/lib/spotify/api";
import { fetchPlaylistRailData, type PlaylistRailData } from "@/lib/spotify/library";
import { fetchQueueData, type QueueData } from "@/lib/spotify/queue";
import {
  ensureSpotifyTokens,
  parseSpotifyTokenPayload,
  type SpotifyTokenPayload,
} from "@/lib/spotify/session";

type SpotifyAuthState = {
  authenticated: boolean;
  profile: SpotifyCurrentUser | null;
  tokens: SpotifyTokenPayload | null;
  error: string | null;
};

async function resolveSpotifyAuthState(): Promise<SpotifyAuthState> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SPOTIFY_COOKIE_KEYS.tokens)?.value;
  const parsedToken = parseSpotifyTokenPayload(rawToken);

  if (!parsedToken) {
    return { authenticated: false, profile: null, tokens: null, error: null };
  }

  const refreshedTokens = await ensureSpotifyTokens(parsedToken);

  if (!refreshedTokens) {
    return {
      authenticated: false,
      profile: null,
      tokens: null,
      error: "Spotify session expired. Please log in again.",
    };
  }

  try {
    const profile = await fetchSpotifyCurrentUser(refreshedTokens.accessToken);

    return {
      authenticated: true,
      profile,
      tokens: refreshedTokens,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch Spotify profile:", error);
    return {
      authenticated: false,
      profile: null,
      tokens: null,
      error: "Unable to load Spotify profile. Please log in again.",
    };
  }
}

export default async function Home() {
  const authState = await resolveSpotifyAuthState();
  const primaryAvatar = authState.profile?.images?.[0]?.url ?? null;
  const displayName = authState.profile?.display_name || authState.profile?.id || "Spotify user";
  const userInitial = displayName.charAt(0).toUpperCase();

  let playlistRailData: PlaylistRailData | null = null;
  let queueData: QueueData | null = null;
  let queueError: string | null = null;

  if (authState.authenticated && authState.tokens) {
    try {
      const [rail, queue] = await Promise.all([
        fetchPlaylistRailData(authState.tokens.accessToken),
        fetchQueueData(authState.tokens.accessToken, { type: "liked" }),
      ]);
      playlistRailData = rail;
      queueData = queue;
    } catch (error) {
      console.error("Failed to load playlists or queue:", error);
      queueError = "Unable to fetch tracks for the selected source.";
    }
  }

  if (authState.authenticated) {
    return (
      <main className="flex min-h-screen flex-col px-2 py-2 font-sans sm:px-3 sm:py-3 lg:h-[100dvh] lg:overflow-hidden lg:px-2 lg:py-2">
        <div className="w-full rounded-[28px] border border-[#121212] bg-[#050505] p-2 text-white shadow-[0_30px_70px_rgba(0,0,0,0.45)] lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:p-2.5">
          <header className="flex items-center justify-between rounded-[20px] border border-[#1f1f1f] bg-gradient-to-r from-[#151515] via-[#1a1a1a] to-[#121212] px-4 py-1.5 lg:flex-none">
            <div className="flex items-center gap-[16px]">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-semibold text-black">
                ♫
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/85">Spotify</p>
                <p className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                  Library Manager
                </p>
              </div>
            </div>
            <div className="flex items-center gap-[16px]">
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-100">{displayName}</p>
              </div>
              {primaryAvatar ? (
                <span className="relative h-10 w-10 overflow-hidden rounded-full border border-emerald-500/35 shadow-[0_0_0_1px_rgba(34,197,94,0.08)]">
                  <Image
                    src={primaryAvatar}
                    alt={`${displayName} avatar`}
                    fill
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/55 bg-emerald-500/18 text-sm font-semibold text-emerald-200">
                  {userInitial}
                </span>
              )}
              <a
                href="/api/auth/logout"
                className="rounded-full border border-zinc-700 bg-[#101010] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-200 transition hover:border-emerald-500 hover:bg-[#151515] hover:text-white"
              >
                Log out
              </a>
            </div>
          </header>
          <WorkspaceShell
            playlistRailData={playlistRailData}
            initialQueueData={queueData}
            initialQueueError={queueError}
            spotifyUser={
              authState.profile
                ? {
                    spotifyId: authState.profile.id,
                    displayName: authState.profile.display_name ?? null,
                    email: authState.profile.email ?? null,
                  }
                : null
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 font-sans sm:px-6 lg:px-10">
      <div className="absolute inset-x-0 top-[-14rem] h-[28rem] bg-[radial-gradient(circle_at_top,rgba(29,185,84,0.22),transparent_62%)]" />
      <div className="absolute left-[-8rem] top-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute right-[-7rem] top-16 h-64 w-64 rounded-full bg-zinc-100/5 blur-3xl" />

      <section className="relative w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[#0c0c0c]/95 shadow-[0_35px_120px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(29,185,84,0.08),transparent_28%,transparent_72%,rgba(255,255,255,0.03))]" />
        <div className="relative grid gap-12 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end lg:px-12 lg:py-12">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-500 text-2xl font-semibold text-black shadow-[0_18px_45px_rgba(29,185,84,0.28)]">
                ♫
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.34em] text-emerald-300/90">
                  Spotify
                </p>
                <p className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                  Playlist Manager
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                Fast playlist triage
              </span>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                Spotify Playlist Manager
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
                Sort through large playlists with a keyboard-first review flow, stage your moves in
                batches, and confirm everything in one pass when the library looks right.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Review</p>
                <p className="mt-2 text-base font-medium text-zinc-100">
                  Rapid track-by-track decisions without losing context.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Organize</p>
                <p className="mt-2 text-base font-medium text-zinc-100">
                  Move songs, create playlists, rename, and clean up in one workspace.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Confirm</p>
                <p className="mt-2 text-base font-medium text-zinc-100">
                  Queue actions safely first, then apply changes only when you are ready.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                  Connect Spotify
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Sign in to start organizing your library.
                </h2>
                <p className="text-sm leading-6 text-zinc-300">
                  Use your Spotify account to load playlists, review tracks, and manage changes from
                  one desktop-style workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                <p className="font-medium text-zinc-100">Session handling stays lightweight.</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Tokens are stored in http-only cookies and refreshed automatically before they
                  expire.
                </p>
                {authState.error ? (
                  <p className="mt-3 text-xs font-medium text-amber-300">{authState.error}</p>
                ) : null}
              </div>

              <Link
                href="/api/auth/login"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Log in with Spotify
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
