# Spotify Playlist Manager — Build Brief

## Goals

- Keyboard-centric playlist review for power users with very large libraries.
- Fast batch decisions: Keep / Remove / Add to playlist(s), then one Confirm.

## MVP Scope (from design)

- AppShell (Left Rail: Library • Top Bar: hotkeys/search • Main: Review)
- Review page with compact track rows & hotkeys: V (Keep), R (Remove), I (Add), J/K (Prev/Next), Z (Undo)
- Batch Confirm modal → chunked Spotify API calls

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind
- Spotify OAuth (Auth Code + PKCE), Web API client
- Lightweight persistence for session/batches (SQLite/Supabase + Prisma)

## First Tasks

1. Auth routes + token refresh
2. Left rail playlists + liked songs
3. Review page loads queue (virtualized)
4. Hotkeys V/R/J/K/Z + “Add to playlist” dialog
5. Batch Confirm (remove/add chunked)
