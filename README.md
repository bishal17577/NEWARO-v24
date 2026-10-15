# NEWARO v24 — Social Commerce & Community Super-App

NEWARO is a React + TypeScript web application with an Express server, Firebase Authentication/Firestore integration points, and server-side Gemini AI routes.

## Run locally

1. Install Node.js LTS (Node 22 or compatible with the lockfile).
2. Open this folder in a terminal.
3. Run `npm ci`.
4. Open `.env.local` and add a NEW Gemini API key to `GEMINI_API_KEY`.
5. Run `npm run dev`.
6. Open the local URL printed by the server (normally `http://localhost:3000`).

On macOS you can also try `START_NEWARO.command` after completing the environment setup.

## Firebase project

The Firebase web configuration is prefilled for project `newaro-21104`. The web API key and app identifiers are client configuration, not service-account credentials. Protect the project with Firebase Authentication settings, restrictive Firestore rules, authorized domains, and API key restrictions where appropriate.

Before using the live site:
- Enable the sign-in providers you use in Firebase Console → Authentication.
- Add the deployed hostname to Authentication → Settings → Authorized domains.
- Review and deploy `firestore.rules` after verifying that they match the app's actual data model.
- Confirm Firestore is enabled in the Firebase project.

## Gemini AI

The private Gemini key is intentionally blank in this ZIP. Create a new key at https://aistudio.google.com/app/apikey and set `GEMINI_API_KEY` in `.env.local` for local use or as a server environment variable in production. Never prefix the key with `VITE_`; never commit `.env.local`.

Use the project's `/api/ai/health` endpoint (if exposed by the running server) to check configuration. A configured key does not by itself prove every AI feature works; test chat, image scan, captions, and product descriptions in the running app.

## Production hosting

Build command: `npm ci && npm run build`
Start command: `npm run start:prod`

Set `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, and optional provider keys in your hosting provider's server-side environment settings. Do not upload `.env.local` to a public repository. Set `PORT` if required by the host. Add the production hostname to Firebase Authentication's authorized domains.

## Verification commands

- `npm run check:syntax`
- `npm run audit:auth-upload`
- `npm run lint`
- `npm run build`

These commands must be run in an environment with dependencies installed. Packaging the ZIP is not equivalent to a successful production build or live-provider test.
