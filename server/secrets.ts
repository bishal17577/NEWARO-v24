import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const val of values) {
    if (!val) continue;
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'MY_GEMINI_API_KEY' || trimmed === 'SERVER_ENV_GEMINI_KEY') continue;
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

const envResendList = (process.env.RESEND_API_KEYS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const RESEND_API_KEYS: string[] = uniqueNonEmpty([
  process.env.RESEND_API_KEY,
  process.env.RESEND_API_KEY_1,
  process.env.RESEND_API_KEY_2,
  ...envResendList,
]);

// Multi-key Gemini API pool with automatic failover and load balancing
const envGeminiList = (process.env.GEMINI_API_KEYS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const GEMINI_API_KEYS: string[] = uniqueNonEmpty([
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  ...envGeminiList,
]);

// Remove.bg API key provided by user for automatic product background removal
export const REMOVE_BG_API_KEY: string = (process.env.REMOVE_BG_API_KEY || '').trim();

export const IMGBB_API_KEYS: string[] = uniqueNonEmpty([
  process.env.IMGBB_API_KEY,
  process.env.IMGBB_API_KEY_1,
  process.env.IMGBB_API_KEY_2,
  ...(process.env.IMGBB_API_KEYS || '').split(',').map((s) => s.trim()),
]);

// STRICT REQUIREMENT: Only bishalxtha17@gmail.com is platform administrator
export const ADMIN_EMAILS: string[] = ['bishalxtha17@gmail.com'];

export const RESEND_FROM: string =
  (process.env.RESEND_FROM && process.env.RESEND_FROM.trim()) ||
  'NEWARO <onboarding@resend.dev>';

export const GMAIL_USER: string =
  (process.env.GMAIL_USER && process.env.GMAIL_USER.trim()) ||
  'bishalxtha17@gmail.com';

export const GMAIL_APP_PASSWORD: string = (process.env.GMAIL_APP_PASSWORD || '').trim();

export const GMAIL_FROM: string = `"NEWARO" <${GMAIL_USER}>`;

export const FIREBASE_WEB_API_KEY: string =
  (process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();

export const FIREBASE_PROJECT_ID: string =
  (process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_PROJECT_ID.trim()) ||
  'newaro-21104';
