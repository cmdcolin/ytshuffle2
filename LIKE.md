# Like / Watch Later / Comments via YouTube Data API

## Idea

Add buttons to the player controls that act on the currently playing video
directly on YouTube:

- **Like** (thumbs up)
- **Add to Watch Later**
- **Show comments** (collapsible panel below the player)

## What we learned

- Requires YouTube Data API v3 with OAuth scope `youtube.force-ssl`
- The Google OAuth access token must be obtained via `signInWithPopup` with
  `GoogleAuthProvider.addScope(...)` and
  `GoogleAuthProvider.credentialFromResult(result).accessToken`
- `prompt: 'consent'` must be set on the provider to force a full OAuth flow
  every sign-in, otherwise Firebase's fast re-auth path skips returning the
  access token
- `localhost` must be in the OAuth client's authorized JavaScript origins in
  Google Cloud Console
- The token is short-lived (~1 hour) and is not persisted across page refreshes
  — the user must sign in again each session to get a fresh token
- **403 on `videos.rate`**: many videos have ratings disabled; the API returns
  403 in that case with a `ratingsDisabled` reason in the error body — need to
  surface that to the user rather than a generic error

## API endpoints

| Feature     | Method | Endpoint                                                                                                                          |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Like        | POST   | `youtube/v3/videos/rate?id={videoId}&rating=like`                                                                                 |
| Unlike      | POST   | `youtube/v3/videos/rate?id={videoId}&rating=none`                                                                                 |
| Watch Later | POST   | `youtube/v3/playlistItems?part=snippet` body: `{ snippet: { playlistId: 'WL', resourceId: { kind: 'youtube#video', videoId } } }` |
| Comments    | GET    | `youtube/v3/commentThreads?part=snippet&videoId={videoId}&maxResults=20&order=relevance`                                          |

## Setup required (one-time)

1. Google Cloud Console → APIs & Services → OAuth consent screen → add scope
   `youtube.force-ssl`
2. Add yourself (and any other users) as test users on the consent screen
3. Credentials → OAuth client → add `http://localhost:5173` and production
   domain to authorized JavaScript origins

## Implementation sketch

- `src/youtube.ts` — `rateVideo`, `addToWatchLater`, `getComments`
- `src/store.ts` — `youtubeAccessToken: string | null`,
  `setYoutubeAccessToken()`
- `src/firebase.ts` — add scope + `prompt: 'consent'` to `googleProvider`;
  return `credential?.accessToken ?? null` from `signInWithGoogle`
- `src/components/AuthButton.tsx` — after sign-in, call
  `model.setYoutubeAccessToken(token)`
- `src/components/PlayerControls.tsx` — show Like / Watch Later / Comments
  buttons when `!!youtubeAccessToken && playing`
- `src/components/CommentsPanel.tsx` — fetch and display top-level comments,
  toggle open/closed
