import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { SPOTIFY_COOKIE_KEYS } from "@/lib/spotify/auth";
import { fetchSpotifyCurrentUser, SpotifyCurrentUser } from "@/lib/spotify/api";
import { ensureSpotifyTokens, parseSpotifyTokenPayload } from "@/lib/spotify/session";

type SpotifyAuthState = {
  authenticated: boolean;
  profile: SpotifyCurrentUser | null;
  error: string | null;
};

async function resolveSpotifyAuthState(): Promise<SpotifyAuthState> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SPOTIFY_COOKIE_KEYS.tokens)?.value;
  const parsedToken = parseSpotifyTokenPayload(rawToken);

  if (!parsedToken) {
    return { authenticated: false, profile: null, error: null };
  }

  const refreshedTokens = await ensureSpotifyTokens(parsedToken);

  if (!refreshedTokens) {
    return {
      authenticated: false,
      profile: null,
      error: "Spotify session expired. Please log in again.",
    };
  }

  try {
    const profile = await fetchSpotifyCurrentUser(refreshedTokens.accessToken);

    return {
      authenticated: true,
      profile,
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch Spotify profile:", error);
    return {
      authenticated: false,
      profile: null,
      error: "Unable to load Spotify profile. Please log in again.",
    };
  }
}

export default async function Home() {
  const authState = await resolveSpotifyAuthState();
  const primaryAvatar = authState.profile?.images?.[0]?.url ?? null;
  const displayName = authState.profile?.display_name || authState.profile?.id || "Spotify user";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 pb-16 pt-24 font-sans sm:px-12 lg:px-20">
      <section className="flex flex-col gap-6">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Spotify Playlist Manager
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Keyboard-first triage for massive Spotify libraries.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Review tracks in rapid batches, queue playlist actions, and confirm once when you are
          ready. Built for power users who live inside playlists and crave snappy tooling.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
            App Router + TypeScript
          </span>
          <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
            Tailwind UI primitives
          </span>
          <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
            OAuth + Spotify Web API
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/60 p-6 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200">
          {authState.authenticated ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {primaryAvatar ? (
                  <span className="relative h-12 w-12 overflow-hidden rounded-full border border-emerald-200 dark:border-emerald-700/60">
                    <Image
                      src={primaryAvatar}
                      alt={`${displayName} avatar`}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-sm font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-emerald-500">
                    Connected to Spotify
                  </span>
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {displayName}
                  </span>
                  {authState.profile?.email ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {authState.profile.email}
                    </span>
                  ) : null}
                </div>
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700/60 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                  Connect your Spotify account to begin testing.
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  We store tokens in http-only cookies and auto-refresh them when they near expiry.
                </p>
                {authState.error ? (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {authState.error}
                  </p>
                ) : null}
              </div>
              <Link
                href="/api/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Log in with Spotify
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="text-xl font-semibold">Next up</h2>
          <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              Wire up Spotify OAuth (PKCE) and token refresh flow.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              Render the playlist rail with liked songs and quick filters.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              Prototype the review queue with virtualization + hotkeys.
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-emerald-400 bg-emerald-50/60 p-6 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-900/20 dark:text-emerald-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Core hotkeys</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-mono text-xs">V</dt>
              <dd className="text-emerald-800 dark:text-emerald-200">Keep track</dd>
            </div>
            <div>
              <dt className="font-mono text-xs">R</dt>
              <dd className="text-emerald-800 dark:text-emerald-200">Remove from queue</dd>
            </div>
            <div>
              <dt className="font-mono text-xs">I</dt>
              <dd className="text-emerald-800 dark:text-emerald-200">Add to playlist</dd>
            </div>
            <div>
              <dt className="font-mono text-xs">J / K</dt>
              <dd className="text-emerald-800 dark:text-emerald-200">Navigate tracks</dd>
            </div>
            <div>
              <dt className="font-mono text-xs">Z</dt>
              <dd className="text-emerald-800 dark:text-emerald-200">Undo last action</dd>
            </div>
          </dl>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
            Confirm batches in one click once all actions look good.
          </p>
        </div>
      </section>
    </main>
  );
}
