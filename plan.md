# Spotify Playlist Manager Build Brief

## Goals

- Keyboard-centric playlist review for power users with very large libraries.
- Fast batch decisions: Keep / Remove / Add to playlist(s), then one Confirm.
- Apply Spotify changes safely, with visible progress and recoverable failures.

## MVP Scope

- AppShell (Left Rail: Library + Top Bar + Main: View / Review / Summary).
- Review page with hotkeys: `V` (Keep), `R` (Remove), `I` (Add/Confirm Add), `Z` (Undo), `P` (Play/Pause), `X` (Restart playback), `N` (New Playlist).
- Batch confirm flow with chunked Spotify API calls.
- Persistent review sessions so in-progress work can be resumed.

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind.
- Spotify OAuth (Auth Code + PKCE), Web API client, Web Playback SDK.
- Prisma + Postgres across local development and production.

## Current State

- **Library rail**
  - Loads all playlists plus `Liked Songs`.
  - Shows playlist count in the rail header.
  - Supports selection and queue loading.

- **View mode**
  - Displays playlist hero, track table, metadata columns, and `Load more`.
  - Keeps the left playlist rail visible.

- **Review mode**
  - Ribbon-based playlist targeting with hotkeys.
  - Track card with playback controls and custom progress slider.
  - Track actions: keep, remove, undo.
  - Playlist actions: add to playlist, create local new playlist target.
  - Supports paginated append while reviewing.

- **Persistence**
  - Review sessions, track actions, and add targets are stored in Prisma-backed tables.
  - Existing in-progress sessions can be resumed.
  - Additional loaded tracks are appended to the active review session.

- **Confirm flow**
  - Applies real Spotify writes for:
    - removing tracks from a playlist
    - removing tracks from liked songs
    - adding tracks to playlists
    - creating new playlists for local review-created targets
  - Uses chunked writes to respect Spotify API limits.
  - Shows progress and result counts in the summary screen.
  - Returns structured partial-failure diagnostics.
  - Supports retrying only failed actions instead of replaying successful ones.
  - Re-fetches the source queue after confirm and reconciles the refreshed total against the expected post-removal total.

## Known Gaps

- No dedicated post-confirm audit/history page yet.
- No automated retry/backoff policy beyond manual retry of failed actions.
- `plan.md` previously lagged behind implementation; this version is the current baseline.

## Next Priorities

1. **Postgres environment rollout**
   - Standardize `DATABASE_URL` in `.env` and `.env.local`.
   - Run Prisma generate/migrate against a real Postgres instance.
   - Verify review session persistence after the DB switch.

2. **Deployment readiness**
   - Lock down environment variables and redirect URI strategy.
   - Verify Spotify dashboard settings for hosted usage.
   - Decide hosting target and expected auth domain flow.

3. **Write-path confidence**
   - Add stronger verification around applied Spotify mutations.
   - Consider logging/audit records for confirm attempts and outcomes.

4. **UX polish**
   - Improve confirm messaging and success/failure surfacing.
   - Refine summary-state transitions and refresh behavior.

## How to start the app

`npm run dev -- --hostname 127.0.0.1 --port 3000`
