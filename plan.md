# Spotify Playlist Manager — Build Brief

## Goals

- Keyboard-centric playlist review for power users with very large libraries.
- Fast batch decisions: Keep / Remove / Add to playlist(s), then one Confirm.

## MVP Scope (from design)

- AppShell (Left Rail: Library · Top Bar: hotkeys/search · Main: Review)
- Review page with compact track rows & hotkeys: V (Keep), R (Remove), I (Add), J/K (Prev/Next), Z (Undo)
- Batch Confirm modal + chunked Spotify API calls

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind
- Spotify OAuth (Auth Code + PKCE), Web API client
- Lightweight persistence for session/batches (SQLite/Supabase + Prisma)

## Current Review Workflow (supported)

- **Select playlist:** via rail (hotkeys S/D/F/G/H/J/K/L on visible tiles), scroll ribbon with A / ;.
- **View mode:** table with #, title/artists, album, duration; “Review” button; load more supported.
- **Review mode:** ribbon + track card + actions panel.
  - Ribbon: select playlists as add targets (green border); A / ; scroll; S–L select.
  - Track card: shows current track info, position, placeholder playback controls (P play/pause, X repeat; no audio yet).
  - Track actions: V keep, R remove (advances), Z undo (undo or clear selections).
  - Playlist actions: N new playlist (name modal, generated color cover), I add-to-playlist (enter add mode → select playlists → I to confirm). No Spotify write yet.
  - Load more: available when more tracks exist (pagination append).

## Not Yet Implemented

- Actual Spotify write calls for keep/remove/add.
- Audio preview playback (using preview_url).
- Auto-load during review, filters, batch confirm UX.

## How to start the app

`npm run dev -- --hostname 127.0.0.1 --port 3000`
