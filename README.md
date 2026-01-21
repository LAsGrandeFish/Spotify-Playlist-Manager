<div align="center">
  <h1>Spotify Playlist Manager</h1>
  <p>Keyboard-centric playlist triage for power users with massive Spotify libraries.</p>
</div>

## Stack

- Next.js App Router + React 19 + TypeScript
- Tailwind CSS for styling primitives
- ESLint (Next.js presets + Prettier) & Prettier formatting
- Husky pre-commit hook (`lint` + `format:check`)

## Getting Started

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Visit [http://127.0.0.1:3000](http://127.0.0.1:3000) to see the current UI shell. Edit files under `src/app` and the page will hot-reload.

## Spotify OAuth Setup

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:3000/api/auth/callback` as a redirect URI (and add any production URIs you plan to use).
3. Copy the Client ID (and Client Secret if you plan to allow server-side refresh without PKCE-only mode).
4. Create a `.env.local` (already git-ignored) with:

   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
   ```

5. Restart `npm run dev` so the new environment variables load.

On the homepage, click **Log in with Spotify** to run the full PKCE flow. A successful login displays your Spotify profile at the top of the page and stores tokens in an HTTP-only cookie. Tokens are refreshed automatically as they near expiry; use **Log out** to clear the cookie and restart the flow.

## Database (Phase 1)

Local development uses SQLite via Prisma.

1. Ensure `.env.local` contains:

   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```

2. Initialize the schema when ready:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## Available Scripts

- `npm run dev` – start the Next.js dev server
- `npm run build` – build the production bundle
- `npm run start` – run the production build locally
- `npm run lint` / `npm run lint:fix` – ESLint with Prettier compatibility
- `npm run format` / `npm run format:check` – Prettier formatting helpers

## Roadmap

- [x] Spotify OAuth (PKCE) + token refresh
- [x] Playlist rail + playlist viewer
- [x] Review mode with hotkeys + summary screen
- [x] Web Playback SDK integration (full playback)
- [ ] Persist review sessions (DB + Prisma)
- [ ] Batch confirmation modal with chunked Spotify API writes

## Notes

- Husky installs automatically via the `prepare` script and runs `lint` + `format:check` on `pre-commit`.
- Tailwind configuration lives in `tailwind.config.ts`; global styles sit in `src/app/globals.css`.
