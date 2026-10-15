# NEWARO v22 report

## Root cause of "Your sign-in session is not active"
The server checked your login with `FIREBASE_WEB_API_KEY`, but the zip had no `.env.local`, so that value was empty and **every** AI and upload request was rejected with 401, even when signed in.

## Fixes
- Server now verifies the Firebase login token with Google's public certificates. No secret or env value is needed for sign-in checks. Tested with signed, expired, tampered, wrong-project and garbage tokens.
- `.env.local` added with Firebase settings and the Gemini key (server-only).
- `npm install` was failing (esbuild 0.25 vs Vite 8 peer range). Pinned to ^0.28.
- `check:syntax` script broke on TypeScript 7. Rewritten with esbuild.
- Type error in the AI route fixed. `lint` and `build` now pass.

## NEWARO AI
- Upload button, drag and drop, preview, and a "Photo scan" card: face count, per-face visible details (expression, hair, glasses, headwear, rough age range), objects, text in the image, scene, colours.
- Does NOT identify who a person is and does not infer race, religion, health or similar. Age is a rough estimate.
- Answers any question; NEWARO products, prices and shops come only from real listings (invented product IDs are filtered out).
- Expired login tokens are refreshed and retried automatically. Real failure reasons are shown.
- Vertex-style `AQ.` keys are sent as `?key=` as well as the header.

## Stories
Rebuilt as header / photo / footer rows so nothing overlaps; soft blurred-photo backdrop instead of black; background page scroll locked; Esc and arrow keys; safe-area padding; deleting a story keeps the index valid.

## Shops
19 category looks (fashion, tech, flowers, food, grocery, beauty, health, home, sports, books, art, jewellery, handmade, auto, pets, toys, services, freelance, events) plus default. Each has its own colours, header pattern, typography, product layout (portrait / square / list / wide / compact) and button wording. Shop page gains search, category chips and sort. Shop list cards and the Create Shop form show the theme. 21 categories already exist for selection.

## Verified here
- `npm run lint`, `npm run build`, `npm run check:syntax` (77 files), `npm run audit:auth-upload` (21/21): PASS
- Real server run with mocked Google calls: 401 without login, text answer, photo scan with image attached, bad image rejected, upload fallback path, upload without login rejected: PASS

## Not verified here (could not reach Google or open a browser)
- A live call to Gemini with your key
- Live Google sign-in, Firestore, ImgBB
- On-screen appearance of the new story viewer and shop designs on phone and desktop

## Security
The Gemini key was pasted in chat, so treat it as exposed: create a new one in Google AI Studio, replace it in `.env.local` / host env vars, and delete the old one. Do not commit `.env.local`.
