# NEWARO v24 — Gemini model update and release notes

## Included in this update
- Updated the backend Gemini model failover list to prefer `gemini-3.5-flash-lite`, with `gemini-3.6-flash` and `gemini-3.1-flash-lite` fallbacks.
- Bumped package version to 24.0.0 and updated the README heading.
- Left Gemini API credentials blank; configure `GEMINI_API_KEY` only in the server environment or local ignored `.env.local`. Never use `VITE_GEMINI_API_KEY`.

## Validation
- ZIP archive integrity checked after packaging.
- Source search confirms the old `gemini-2.5-flash-lite` model ID is not present in the backend source.
- A production build, live Gemini call, Firebase/Firestore rules audit, email delivery, load test, and end-to-end UI test were not run for this update.

## Important scope note
This is a targeted AI model-availability repair on the supplied v22 source, packaged as v24. It does **not** implement or certify the requested 100+ new features, 10-million-user scale, production security, or every Firebase data flow. Those require feature-by-feature implementation, infrastructure design, security review, and real load/end-to-end testing. Do not treat this ZIP as production-certified.
