# Spotify Playlist Manager Plan

## Product Goal

Build a polished, keyboard-centric Spotify playlist review tool for power users with large libraries. The app should help users review tracks quickly, queue playlist decisions safely, and confirm batch changes with clear feedback and recoverable failure handling.

## Current Product Scope

- Left library rail with `Liked Songs` plus all user playlists
- Viewer mode with playlist hero, track table, metadata, and `Load more`
- Review mode with:
  - `V` keep
  - `R` remove
  - `I` add / confirm add
  - `Z` undo
  - `P` play/pause
  - `X` restart playback
  - `N` new playlist
- Summary / confirm mode with:
  - removed / kept / added groupings
  - confirm status and progress
  - partial failure diagnostics
  - retry for failed actions only
  - confirm-attempt history

## Technical Baseline

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Spotify OAuth + Web API + Web Playback SDK

## Architecture Notes

- Review sessions, track actions, add targets, and confirm attempts are persisted
- Confirm writes are chunked to respect Spotify API limits
- Post-confirm reconciliation refreshes Spotify data and compares expected totals with actual totals
- In-progress review sessions can be resumed

## Main Workstreams

### 1. Product Story / UX Polish

- [ ] Strengthen review progress visibility
- [ ] Make keep / remove / pending state clearer during review
- [ ] Improve add-to-playlist clarity while reviewing
- [ ] Make post-confirm success and reporting feel more intentional
- [ ] Improve empty, loading, and error states across view / review / summary
- [ ] Continue visual consistency cleanup across rail, review stage, and summary

### 2. Technical Depth

- [ ] Build a dedicated review/session history page
- [ ] Add playlist cleanup analytics / outcome insights
- [ ] Surface stronger reconciliation reporting
- [ ] Expand duplicate-target / already-in-playlist handling UX
- [ ] Improve session recovery / resume behavior further

### 3. Architecture / Quality

- [ ] Clarify boundaries between UI state, persistence, and Spotify write logic
- [ ] Reduce coupling between review UI and confirm pipeline
- [ ] Standardize typed request/response contracts
- [ ] Document persistence model and confirm flow
- [ ] Review schema for future extensibility

### 4. Documentation / GitHub Readiness

- [ ] Rewrite README around product problem, workflow, and technical highlights
- [ ] Add architecture overview and flow diagram
- [ ] Add screenshots of key states
- [ ] Improve setup instructions for auth, DB, and local development
- [ ] Add engineering decisions / tradeoffs section

### 5. Credibility Signals

- [ ] Add focused tests around confirm / retry / reconciliation logic
- [ ] Improve structured logging and diagnostics
- [ ] Verify lint / formatting / migration workflows stay clean
- [ ] Add safer guards around confirm and resume failure paths
- [ ] Review keyboard accessibility and predictability

## Highest-Value Next Batch

1. Strengthen review progress visibility
2. Clarify keep/remove/pending decision state
3. Improve post-confirm success/reporting experience

## Known Gaps

- No dedicated post-confirm audit/history page yet
- No automated retry/backoff strategy beyond manual retry of failed work
- Documentation is still lighter than the product quality of the app itself

## Local Commands

Start dev server:

`npm run dev -- --hostname 127.0.0.1 --port 3000`

Lint:

`npm run lint`

Generate Prisma client:

`npx prisma generate`

Run migrations:

`npx prisma migrate dev --name your_migration_name`
