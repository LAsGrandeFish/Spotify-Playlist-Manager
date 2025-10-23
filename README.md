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
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the current UI shell. Edit files under `src/app` and the page will hot-reload.

## Available Scripts

- `npm run dev` – start the Next.js dev server
- `npm run build` – build the production bundle
- `npm run start` – run the production build locally
- `npm run lint` / `npm run lint:fix` – ESLint with Prettier compatibility
- `npm run format` / `npm run format:check` – Prettier formatting helpers

## Roadmap

- [ ] Spotify OAuth (PKCE) + token refresh
- [ ] Playlist rail with liked songs + filters
- [ ] Virtualized review queue with hotkeys (V/R/I/J/K/Z)
- [ ] Batch confirmation modal that chunks Spotify API writes

## Notes

- Husky installs automatically via the `prepare` script and runs `lint` + `format:check` on `pre-commit`.
- Tailwind configuration lives in `tailwind.config.ts`; global styles sit in `src/app/globals.css`.
