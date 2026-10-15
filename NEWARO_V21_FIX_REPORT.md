# NEWARO v21 — Sign-in, image upload, and chat repair

## Changes
- Fixed the authentication listener incorrectly restoring a cached localStorage user after Firebase had signed out. The cached profile is not treated as an authenticated session.
- Auth loading starts as true while Firebase restores the real session.
- Image uploads now require a live Firebase user and use an authenticated `/api/image/upload` server endpoint. ImgBB keys stay server-side and no data URL is returned as a fake hosted upload.
- Added server-side upload validation, size limits, timeouts, key failover, and actionable error responses.
- Chat image upload validates sign-in, selected conversation, image MIME type, and file size; errors are shown to the user.
- Failed chat sends are no longer falsely marked as sent. Conversation document creation errors are no longer swallowed.
- AI chat now displays useful server/network/auth errors rather than always disguising them as product-search results.
- Removed hardcoded exposed ImgBB, Gemini, remove.bg, Resend, Gmail app-password, and admin passcode fallbacks from source.
- Removed client-supplied email/UID trust and passcode-based server admin access.
- Configured the provided NEWARO Firebase web project (`newaro-21104`) in `.env.local`; server-only API keys are intentionally blank and must be added as newly generated keys.
- Added Mac launcher, `.env.example`, static audit, and syntax check scripts.

## Run
1. Extract the project.
2. Double-click `START_NEWARO.command` on macOS, or run `npm install` then `npm run dev`.
3. Sign in through Firebase.
4. Add a newly generated `GEMINI_API_KEY` and `IMGBB_API_KEY_1` to `.env.local` for AI and image uploads. Restart the server after editing environment values.
5. Run `npm run audit:auth-upload` and `npm run check:syntax`.

## Verification results (this environment)
- `npm run audit:auth-upload`: **PASS, 15/15 checks**.
- `npm run check:syntax`: **PASS, 75 TypeScript/TSX files transpiled with zero syntax diagnostics**.
- `npm run build`: **BLOCKED, exit code 127**. The environment does not have a usable local Vite installation (`vite: Permission denied`); dependencies were not installed in this run.
- `npm run lint`: **BLOCKED, exit code 2**. TypeScript cannot find `vite/client` because project dependencies are not installed.
- Live Firebase sign-in, Firestore chat rules, Gemini requests, and ImgBB uploads: **NOT TESTED**; this environment has no configured replacement provider keys and no live browser session.
- ZIP archive integrity: checked after packaging.
- No production deployment was performed.

These results do not prove that every live feature is working. After extracting the ZIP, the first run needs network access for dependency installation, and you must add newly generated Gemini/ImgBB keys to `.env.local` before those integrations can work.

## Security
Any previously pasted Gemini, ImgBB, Resend, remove.bg, or Gmail app-password value should be revoked and replaced. Never put server provider keys in `VITE_` variables or commit `.env.local`. Firebase browser config is public client config; restrict its API key to your domains and intended APIs.
