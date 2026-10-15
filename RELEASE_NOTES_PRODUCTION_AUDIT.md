# Release package notes

This ZIP is a security-conscious source package with a 222-item feature gap checklist and production release gates. It is **not certified production-ready** and does not pretend that all roadmap items are implemented.

## Changes in this package
- Added `PRODUCTION_GAP_ANALYSIS.md`.
- Added `FEATURE_GAP_CHECKLIST.md` with 222 feature requirements.
- Added this release note.
- Excluded `.env.local` from the distributed archive to avoid shipping local secrets.
- Preserved the existing application source and package lockfiles.

## Before running
1. Install Node.js 22 or a version compatible with the project lockfile.
2. Copy `.env.example` to `.env.local` and set the required values for your environment.
3. Rotate any credentials that were ever stored in the original `.env.local`.
4. Run `npm ci`, `npm run check:syntax`, `npm run audit:auth-upload`, `npm run lint`, and `npm run build`.
5. Complete every relevant release gate in `PRODUCTION_GAP_ANALYSIS.md`.

## Limits
No production build, live payment, live email delivery, Firebase rules test, penetration test, or load test is claimed by this package.
