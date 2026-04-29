# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run lint         # ESLint (0 warnings allowed)
npm run format       # Prettier
npm run test         # Vitest
npm run deploy       # Build + deploy to GitHub Pages
npm run lambda:build # Compile lambda functions
```

Type-check with `npx tsgo` (not `npx tsc`). Run a single test file with
`npx vitest run src/util.test.ts`.

## Architecture

**ytshuffle** is a React + MobX SPA where users browse and play videos from
YouTube channels/playlists. A set of AWS Lambda functions proxy YouTube Data API
v3 calls (the API key lives server-side). User data (channels, playlists) is
persisted to localStorage and optionally synced to Firebase Firestore when
signed in.

### Data flow

1. User adds a YouTube URL (video, playlist, or channel handle)
2. Frontend calls one of three Lambda endpoints (`src/consts.ts`) to resolve it
   to a playlist ID, then fetches paginated contents
3. Videos are cached in IndexedDB (localforage, keyed by URL) and stored in
   `store.videoMap`
4. MobX reactivity drives all UI updates — no manual re-renders

### Store (`src/store.ts`)

Single MobX `Store` class with `makeAutoObservable`. Key computed views:

- `videoFlat` — all videos from selected channels/playlist
- `list` — `videoFlat` filtered by `store.filter`
- `playlistItems` — parsed channel entries (videoId / playlistId / handle) for
  the active selection

Three `autorun` blocks handle side effects: fetching when selections change,
syncing channels/playlists to localStorage + Firestore, and updating URL query
params for shareable links.

### Lambdas (`lambda/`)

Three handlers: `getPlaylist.ts` (video → channel uploads playlist),
`getPlaylistFromHandle.ts` (handle → playlist), `getPlaylistContents.ts`
(paginated playlist items). Each wraps YouTube API errors in a custom
`HttpError`. The deploy script updates Lambda environment variables — see
`POTENTIAL_TODO.md` for a known caveat with `Variables={...}` replacing all
existing vars.

### Firebase (`src/firebase.ts`)

Auth (Google sign-in) and Firestore sync. Cloud data is loaded once after auth
and merged into the store. Writes happen in `autorun` whenever `channels` or
`playlists` change.

### URL state

Channel selections and active playlist are serialized to query params (`ids`,
`pids`, `handles`, `playlist`) via an `autorun`, enabling shareable links.
