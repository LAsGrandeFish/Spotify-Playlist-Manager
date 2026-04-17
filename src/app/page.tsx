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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 pb-16 pt-24 font-sans sm:px-12 lg:px-20">
      <section className="flex flex-col gap-6">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Spotify Playlist Manager
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Keyboard-first triage for massive Spotify libraries.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600">
          Review tracks in rapid batches, queue playlist actions, and confirm once when you are
          ready. Built for power users who live inside playlists and crave snappy tooling.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <span className="rounded-full border border-zinc-200 px-3 py-1">
            App Router + TypeScript
          </span>
          <span className="rounded-full border border-zinc-200 px-3 py-1">
            Tailwind UI primitives
          </span>
          <span className="rounded-full border border-zinc-200 px-3 py-1">
            OAuth + Spotify Web API
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/60 p-6 text-sm shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-base font-medium text-zinc-900">
                Connect your Spotify account to begin testing.
              </p>
              <p className="text-xs text-zinc-600">
                We store tokens in http-only cookies and auto-refresh them when they near expiry.
              </p>
              {authState.error ? (
                <p className="text-xs font-medium text-amber-600">{authState.error}</p>
              ) : null}
            </div>
            <Link
              href="/api/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Log in with Spotify
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
