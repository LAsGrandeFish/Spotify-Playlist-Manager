# Resume Project Handoff

This file is a compact handoff for starting a new chat/task without losing project context.

## Project Summary

Spotify Playlist Manager is a keyboard-centric Next.js app for reviewing large Spotify libraries and batching playlist decisions before one confirm step.

Core stack:

- Next.js App Router
- TypeScript
- Tailwind
- Spotify OAuth + Web API + Web Playback SDK
- Prisma + Postgres

## Current Product State

### Library / Viewer

- Left rail loads all playlists plus `Liked Songs`
- Playlist count is shown in the rail header
- Viewer mode shows:
  - playlist hero
  - track table
  - metadata columns
  - `Load more`

### Review Mode

- Ribbon-based playlist targeting
- Hotkeys:
  - `V` keep
  - `R` remove
  - `I` add / confirm add
  - `Z` undo
  - `P` play/pause
  - `X` restart playback
  - `N` new playlist
- Supports:
  - keep / remove decisions
  - add-to-playlist targets
  - local new-playlist targets
  - paginated append while reviewing
  - persisted/resumable review sessions

### Summary / Confirm

- Summary screen shows removed / kept / added groupings
- Confirm flow applies real Spotify writes for:
  - removing from playlist
  - removing from liked songs
  - adding to playlists
  - creating new playlists for local targets
- Confirm flow supports:
  - progress stats
  - partial-failure diagnostics
  - retry only failed actions
  - post-confirm reconciliation against refreshed Spotify data

### Audit / History

- Confirm attempts are stored in DB
- Summary screen now shows recent confirm attempts for the current session

## Persistence / Database

- Project is now on Postgres, not SQLite
- Prisma uses `@prisma/adapter-pg` and `pg` in runtime
- Review sessions, review tracks, actions, add targets, and confirm attempts are persisted

Important files:

- [src/lib/db.ts](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/src/lib/db.ts:1)
- [prisma/schema.prisma](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/prisma/schema.prisma:1)

## Important Environment Note

The Postgres password contains a `$`.

Do **not** leave it as a raw `$` in `.env` / `.env.local`, because different tools interpret that differently.

Use URL encoding in `DATABASE_URL`, for example:

```env
DATABASE_URL="postgresql://postgres:VUu%24MjU0E@localhost:5432/spotify_playlist_manager?schema=public"
```

That format is currently working across:

- Next dev server
- Prisma runtime
- Prisma CLI / migrations

## Recent Technical Work Completed

- Switched app persistence from SQLite-style setup to Postgres
- Fixed Prisma 7 runtime by adding the Postgres adapter
- Hardened Spotify token refresh and stale-cookie handling
- Added confirm progress UI and partial-failure diagnostics
- Added retry support for failed Spotify mutation chunks
- Added post-confirm reconciliation against refreshed Spotify source data
- Cleaned lint warnings so `npm run lint` is clean
- Added confirm-attempt audit records in DB
- Added summary-screen confirm-attempt history panel
- Created resume-focused roadmap file

## Files Added Recently

- [resume-roadmap.md](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/resume-roadmap.md:1)
- [resume-handoff.md](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/resume-handoff.md:1)
- [src/app/api/review/sessions/[sessionId]/attempts/route.ts](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/src/app/api/review/sessions/[sessionId]/attempts/route.ts:1)

## Resume-Focused Direction

We are intentionally **not** prioritizing deployment right now.

The current goal is to make this app stronger as a resume/personal project by improving:

- product quality
- UX clarity
- technical depth
- architecture
- documentation

Tracking file:

- [resume-roadmap.md](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/resume-roadmap.md:1)

## New Working Priorities

### 1. Strengthen The Product Story

Focus on making the product feel more complete and intentional.

Key brainstorm areas already captured:

- stronger progress visibility during review
- clearer current-track decision / undecided state
- better add-to-playlist clarity
- more complete post-confirm success/report state
- better empty/loading/error UX polish

### 2. Add Standout Technical Features

- dedicated review/session history page
- cleanup analytics and insights
- stronger reconciliation reporting
- better duplicate-target handling

### 3. Improve Architecture / Docs / Credibility

- cleaner boundaries
- better README and diagrams
- focused tests around confirm/retry/reconciliation

## Best Next Implementation Batch

If starting fresh in a new chat, the best next work is:

1. Strengthen review progress visibility
2. Make keep/remove/pending state clearer during review
3. Improve the post-confirm success/report experience

That is the recommended first batch under `Strengthen The Product Story`.

## Useful Commands

Start dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Lint:

```bash
npm run lint
```

Format one file:

```bash
npx prettier --write resume-roadmap.md
```

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev --name your_migration_name
```

## Notes For The Next Chat

- Use [resume-roadmap.md](/c:/Users/ivanz/Documents/Side_Projects/Spotify_Playlist_Manager/resume-roadmap.md:1) as the checklist
- Use this file as the context summary
- The immediate requested direction is to begin with `Strengthen The Product Story`
