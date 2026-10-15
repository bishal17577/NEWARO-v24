# NEWARO v20 final — changes
- Gemini now called over REST. "AIza..." keys use Google AI Studio; "AQ...." keys use the Vertex AI express endpoint (falls back to AI Studio). 4 keys rotate; a key that hits quota rests 5 min, a rejected key 30 min. Model fallback: 2.5-flash, 2.0-flash, 2.5-flash-lite.
- /api/ai/health shows ready keys and the last error per key (never the keys).
- ImgBB keys rotate with failover.
- New: Find by Photo (camera button in Search). Identifies items only, never people.
- Story viewer renders full-screen over the whole page, fits the screen, no black bars (blurred photo backdrop).
- remove.bg, Gmail, Resend credentials are in .env.local (server only).
