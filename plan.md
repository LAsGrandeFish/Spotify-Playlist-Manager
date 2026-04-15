# Spotify Playlist Manager Build Brief

## Goals

- Keyboard-centric playlist review for power users with very large libraries.
- Fast batch decisions: Keep / Remove / Add to playlist(s), then one Confirm.

## MVP Scope (from design)

- AppShell (Left Rail: Library + Top Bar + Main: Review).
- Review page with hotkeys: V (Keep), R (Remove), I (Add), Z (Undo), P (Play/Pause), X (Restart).
- Batch Confirm modal + chunked Spotify API calls.

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind.
- Spotify OAuth (Auth Code + PKCE), Web API client, Web Playback SDK.
- Persistent storage for review sessions (SQLite/Postgres + Prisma).

## Current Review Workflow (supported)

- **Select playlist:** via rail (hotkeys S/D/F/G/H/J/K/L on visible tiles), scroll ribbon with A / ;.
- **View mode:** table with #, title/artists, album, duration; Review button; load more supported.
- **Review mode:** ribbon + track card + actions panel.
  - Ribbon: select playlists as add targets (green border); A / ; scroll; S-L select.
  - Track card: shows current track info and playback controls (P play/pause, X restart).
  - Track actions: V keep, R remove (advances), Z undo (undo or clear selections).
  - Playlist actions: N new playlist (name modal, generated color cover), I add-to-playlist (enter add mode + select playlists + I to confirm). No Spotify write yet.
  - Load more: available when more tracks exist (pagination append).
- **Summary:** Confirm/Restart screen with removed/kept/added columns and counts.

## Not Yet Implemented

- Actual Spotify write calls for keep/remove/add.
- Persisted review state (DB) + resumable sessions.
- Confirm progress modal with per-action status.
- Error reporting and retry strategy for Spotify writes.

## Implementation Plan (commit-friendly)

1. **DB foundation**
   - Choose DB (SQLite for local dev, Postgres for prod) + Prisma schema.
   - Tables: users, review_sessions, review_tracks, review_actions, playlist_targets.
   - Commit: DB setup + migrations + seed helpers.

2. **Persist review state**
   - Save review actions as they happen (keep/remove/add targets).
   - Restore state on refresh or resume.
   - Commit: session persistence + API routes.

3. **Spotify write layer**
   - API routes to create playlist, add tracks, remove tracks.
   - Chunking (max 100 tracks per call) + retries.
   - Commit: write endpoints + shared Spotify API helpers.

4. **Confirm progress modal**
   - UI modal listing actions with live status.
   - Show partial failures + retry button.
   - Commit: modal UI + wiring to write endpoints.

5. **Post-confirm cleanup**
   - Clear local session state, refresh playlist/queue.
   - Commit: summary finalize + cleanup flow.

## How to start the app

npm run dev -- --hostname 127.0.0.1 --port 3000
