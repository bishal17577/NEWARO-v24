import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { X509Certificate, verify as cryptoVerify } from 'node:crypto';
import {
  RESEND_API_KEYS,
  GEMINI_API_KEYS,
  ADMIN_EMAILS,
  RESEND_FROM,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  GMAIL_FROM,
  FIREBASE_WEB_API_KEY,
  FIREBASE_PROJECT_ID,
  REMOVE_BG_API_KEY,
  IMGBB_API_KEYS,
} from './server/secrets';
import {
  renderEmailTemplate,
  ALLOWED_EMAIL_TYPES,
  EmailTemplateType,
} from './server/emailTemplates';

dotenv.config({ path: '.env.local' });
dotenv.config();

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

const tokenCache = new Map<string, VerifiedUser & { expiresAt: number }>();

// -------------------------------------------------------------
// Firebase ID token verification.
// The token is a signed JWT. We check the signature with Google's public
// certificates, so NO secret key or FIREBASE_WEB_API_KEY is required on the server.
// -------------------------------------------------------------
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let googleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function loadGoogleCerts(force = false): Promise<Record<string, string>> {
  if (!force && googleCerts && googleCerts.expiresAt > Date.now()) return googleCerts.certs;
  const resp = await fetch(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`Google certificate request failed (HTTP ${resp.status})`);
  const certs = (await resp.json()) as Record<string, string>;
  const maxAge = Number(/max-age=(\d+)/.exec(resp.headers.get('cache-control') || '')?.[1] || 3600);
  googleCerts = { certs, expiresAt: Date.now() + Math.max(300, maxAge) * 1000 };
  return certs;
}

function b64urlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function verifyJwtWithCerts(
  token: string,
  certs: Record<string, string>,
  projectId: string,
  nowMs = Date.now()
): VerifiedUser | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(b64urlToBuffer(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlToBuffer(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
  if (header?.alg !== 'RS256' || !header?.kid || !certs[header.kid]) return null;
  let signatureOk = false;
  try {
    const publicKey = new X509Certificate(certs[header.kid]).publicKey;
    signatureOk = cryptoVerify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      b64urlToBuffer(parts[2])
    );
  } catch {
    return null;
  }
  if (!signatureOk) return null;
  const nowSec = Math.floor(nowMs / 1000);
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 300) return null;
  const uid = String(payload.sub || payload.user_id || '');
  if (!uid) return null;
  return {
    uid,
    email: String(payload.email || '').toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
  };
}

export async function verifyFirebaseToken(idToken?: string): Promise<VerifiedUser | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length < 20) {
    return null;
  }
  const cleanToken = idToken.trim();
  const cached = tokenCache.get(cleanToken);
  if (cached && cached.expiresAt > Date.now()) {
    return { uid: cached.uid, email: cached.email, emailVerified: cached.emailVerified };
  }

  let verified: VerifiedUser | null = null;
  try {
    verified = verifyJwtWithCerts(cleanToken, await loadGoogleCerts(), FIREBASE_PROJECT_ID);
    if (!verified) {
      // Google rotates certificates. Refresh once before rejecting the token.
      verified = verifyJwtWithCerts(cleanToken, await loadGoogleCerts(true), FIREBASE_PROJECT_ID);
    }
  } catch (err: any) {
    console.warn('[NEWARO AUTH] certificate check failed:', err?.message || err);
  }

  // Optional second path when a web API key exists (only used if the certificate check could not run).
  if (!verified && FIREBASE_WEB_API_KEY) {
    try {
      const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: cleanToken }),
          signal: AbortSignal.timeout(8000),
        }
      );
      if (resp.ok) {
        const data: any = await resp.json();
        const acc = data?.users?.[0];
        if (acc?.localId) {
          verified = {
            uid: String(acc.localId),
            email: String(acc.email || '').toLowerCase(),
            emailVerified: Boolean(acc.emailVerified),
          };
        }
      }
    } catch {}
  }

  if (!verified) return null;
  tokenCache.set(cleanToken, { ...verified, expiresAt: Date.now() + 5 * 60 * 1000 });
  if (tokenCache.size > 2000) tokenCache.clear();
  return verified;
}

export function isAdmin(email?: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized === 'bishalxtha17@gmail.com' ||
    ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(normalized)
  );
}

async function resolveCallerFromRequest(req: express.Request): Promise<{
  caller: VerifiedUser | null;
  bearerToken: string;
}> {
  const authHeader = String(req.headers.authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const verified = await verifyFirebaseToken(bearerToken);
  if (verified) {
    return { caller: verified, bearerToken };
  }
  return { caller: null, bearerToken };
}

// -------------------------------------------------------------
// NEWARO AI: GEMINI KEY POOL (balanced rotation + automatic failover)
// Keys stay on the server. The browser never receives them.
// -------------------------------------------------------------

interface GeminiKeyState {
  index: number;
  key: string;
  cooldownUntil: number;
  okCount: number;
  errorCount: number;
}

const geminiKeyStates: GeminiKeyState[] = (() => {
  const keys = [...GEMINI_API_KEYS];
  const fromEnv = (process.env.GEMINI_API_KEY || '').trim();
  if (fromEnv && !keys.includes(fromEnv)) keys.unshift(fromEnv);
  return keys
    .filter((k) => typeof k === 'string' && k.trim().length >= 10)
    .map((key, index) => ({ index, key: key.trim(), cooldownUntil: 0, okCount: 0, errorCount: 0 }));
})();

let geminiRoundRobin = 0;

// Ready keys are rotated so every key shares the load. A key that hits a limit rests for a while.
function orderedGeminiKeys(): GeminiKeyState[] {
  const now = Date.now();
  const ready = geminiKeyStates.filter((k) => k.cooldownUntil <= now);
  if (ready.length === 0) {
    return [...geminiKeyStates].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  }
  const start = geminiRoundRobin % ready.length;
  geminiRoundRobin = (geminiRoundRobin + 1) % 1000000;
  return [...ready.slice(start), ...ready.slice(0, start)];
}

function classifyGeminiError(message: string): 'quota' | 'auth' | 'other' {
  if (/429|quota|rate.?limit|resource.?exhausted|too many requests/i.test(message)) return 'quota';
  if (/api.?key|permission|unauthori[sz]ed|forbidden|\b401\b|\b403\b|invalid/i.test(message)) return 'auth';
  return 'other';
}

// Prefer currently supported low-cost models; retain modern fallbacks for key/region availability.
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];

interface GeminiImagePart {
  mimeType: string;
  data: string; // base64, no data: prefix
}

// Google AI Studio keys ("AIza...") use the Generative Language API.
// Newer Google Cloud express keys ("AQ....") use the Vertex AI endpoint. Both are called with plain REST.
function geminiUrls(key: string, model: string): string[] {
  const studio = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const vertex = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  return key.startsWith('AQ.') ? [vertex, studio] : [studio];
}

function scrubKey(message: string, key: string): string {
  return message.split(key).join('[key]').slice(0, 240);
}

async function callGeminiOnce(
  url: string,
  key: string,
  params: { prompt: string; systemInstruction?: string; jsonMode?: boolean; images?: GeminiImagePart[] }
): Promise<{ ok: boolean; status: number; text: string; error: string }> {
  const parts: any[] = [
    ...(params.images || []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    { text: params.prompt },
  ];
  const body: any = {
    contents: [{ role: 'user', parts }],
    ...(params.systemInstruction ? { systemInstruction: { parts: [{ text: params.systemInstruction }] } } : {}),
    generationConfig: { ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}) },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, text: '', error: String(data?.error?.message || `HTTP ${response.status}`) };
  }
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
  return { ok: true, status: 200, text, error: text ? '' : 'Gemini returned an empty answer' };
}

const geminiLastErrors = new Map<number, string>();

async function generateWithGeminiFailover(params: {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  images?: GeminiImagePart[];
}): Promise<{ ok: boolean; text: string; error?: string; usedKeyIndex?: number }> {
  if (geminiKeyStates.length === 0) {
    return { ok: false, text: '', error: 'No Gemini API keys configured' };
  }

  let lastError = 'All Gemini keys are busy right now';
  for (const state of orderedGeminiKeys()) {
    let keyFailure: 'quota' | 'auth' | 'other' | null = null;
    let succeeded = false;
    outer: for (const model of GEMINI_MODELS) {
      for (const url of geminiUrls(state.key, model)) {
        try {
          const r = await callGeminiOnce(url, state.key, params);
          if (r.ok && r.text) {
            state.okCount += 1;
            geminiLastErrors.delete(state.index);
            succeeded = true;
            return { ok: true, text: r.text, usedKeyIndex: state.index };
          }
          lastError = scrubKey(r.error, state.key);
          if (r.status === 404) { keyFailure = 'other'; continue; } // this model or endpoint is not offered to this key: try the next
          const kind = r.status === 429 ? 'quota' : classifyGeminiError(`${r.status} ${r.error}`);
          keyFailure = kind;
          if (kind === 'quota') break outer; // out of quota: rest this key, move to the next key
          if (kind === 'auth') continue; // maybe the other endpoint accepts it
          break outer;
        } catch (err: any) {
          lastError = scrubKey(String(err?.message || err || 'Unknown Gemini error'), state.key);
          keyFailure = 'other';
          break outer;
        }
      }
    }
    if (!succeeded) {
      // quota: 5 minutes, rejected key: 30 minutes, other: 30 seconds
      const restMs = keyFailure === 'quota' ? 5 * 60000 : keyFailure === 'auth' ? 30 * 60000 : 30000;
      state.errorCount += 1;
      state.cooldownUntil = Date.now() + restMs;
      geminiLastErrors.set(state.index, lastError);
      console.warn(`[NEWARO AI] key #${state.index + 1} ${keyFailure || 'other'} error, resting ${restMs / 1000}s: ${lastError}`);
    }
  }
  return { ok: false, text: '', error: lastError };
}

// -------------------------------------------------------------
// ImgBB KEY POOL (balanced rotation + automatic failover)
// -------------------------------------------------------------
const imgbbKeyStates = IMGBB_API_KEYS.map((key, index) => ({ index, key, cooldownUntil: 0, okCount: 0, errorCount: 0 }));
let imgbbRoundRobin = 0;
function orderedImgbbKeys() {
  const now = Date.now();
  const ready = imgbbKeyStates.filter((k) => k.cooldownUntil <= now);
  if (ready.length === 0) return [...imgbbKeyStates].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  const start = imgbbRoundRobin % ready.length;
  imgbbRoundRobin = (imgbbRoundRobin + 1) % 1000000;
  return [...ready.slice(start), ...ready.slice(0, start)];
}

// Simple per-visitor limit so one person cannot use up every key
const aiHitLog = new Map<string, number[]>();
function aiRateLimited(req: express.Request, max = 20, windowMs = 60000): boolean {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (aiHitLog.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  aiHitLog.set(ip, recent);
  if (aiHitLog.size > 5000) aiHitLog.clear();
  return recent.length > max;
}

// Per-person limit for NEWARO AI: 13 messages per minute
const aiUserLog = new Map<string, number[]>();
function aiUserLimited(uid: string, max = 13, windowMs = 60000): boolean {
  const now = Date.now();
  const recent = (aiUserLog.get(uid) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  aiUserLog.set(uid, recent);
  return recent.length > max;
}

interface CatalogLine {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  category: string;
  shop: string;
  stock: number;
  about: string;
}

function clipText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function toPositiveNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const NEWARO_CATEGORIES = [
  'Fashion & Clothing', 'Electronics & Computers', 'Phones & Accessories', 'Home & Living', 'Beauty & Personal Care',
  'Flowers & Gifts', 'Food & Bakery', 'Groceries & Daily Needs', 'Health & Wellness', 'Sports & Outdoors',
  'Toys & Baby Products', 'Books & Stationery', 'Jewellery & Watches', 'Furniture & Decor', 'Automotive & Tools',
  'Handmade & Handicrafts', 'Art & Collectibles', 'Pets & Pet Supplies', 'Services & Repairs', 'Freelance & Gigs',
  'Events & Experiences',
];

const NEWARO_SITE_GUIDE =
  'Pages: Home (social feed of posts and stories), Explore (all listed products), Shops (verified local stores), ' +
  'Jobs (freelance work and proposals), Events, Nearby, Orders, Wallet, Chat, Notifications, Favorites, Profile and Settings. ' +
  'Sellers open a shop from Create shop and list items from Create product. Cash on Delivery (COD) is supported.';

// -------------------------------------------------------------
// GMAIL & RESEND EMAIL DELIVERY
// -------------------------------------------------------------
const gmailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
  },
});

async function sendGmailSingle(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; status: number; code: string; message: string }> {
  try {
    const info = await gmailTransporter.sendMail({
      from: GMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return {
      ok: true,
      id: info.messageId || 'sent',
      status: 200,
      code: 'OK',
      message: 'Email delivered successfully via Gmail SMTP',
    };
  } catch (err: any) {
    console.warn('[Gmail SMTP] error:', err?.message || err);
    return {
      ok: false,
      status: 502,
      code: 'GMAIL_FAILED',
      message: err?.message || 'Gmail SMTP failed',
    };
  }
}

async function sendResendSingle(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; status: number; code: string; message: string }> {
  for (const apiKey of RESEND_API_KEYS) {
    if (!apiKey) continue;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });
      const data: any = await response.json().catch(() => ({}));
      if (response.ok && data?.id) {
        return {
          ok: true,
          id: data.id,
          status: 200,
          code: 'OK',
          message: 'Email delivered via Resend API',
        };
      }
    } catch {}
  }
  return {
    ok: false,
    status: 502,
    code: 'RESEND_FAILED',
    message: 'Resend API failed',
  };
}

async function sendEmailUnified(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; status: number; code: string; message: string }> {
  const gmailRes = await sendGmailSingle(payload);
  if (gmailRes.ok) return gmailRes;
  return await sendResendSingle(payload);
}

// -------------------------------------------------------------
// AUTOMATIC REMOVE BACKGROUND VIA REMOVE.BG API
// -------------------------------------------------------------
async function removeBackgroundWithApi(imageBase64OrUrl: string): Promise<{
  ok: boolean;
  resultDataUrl?: string;
  error?: string;
}> {
  try {
    const apiKey = REMOVE_BG_API_KEY.trim();
    if (!apiKey) {
      return { ok: false, error: 'Remove.bg API key not configured' };
    }

    const formData = new FormData();
    formData.append('size', 'auto');

    let processedBuffer: Buffer | null = null;
    if (imageBase64OrUrl.startsWith('http://') || imageBase64OrUrl.startsWith('https://')) {
      try {
        const fetchRes = await fetch(imageBase64OrUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (fetchRes.ok) {
          const arrBuf = await fetchRes.arrayBuffer();
          processedBuffer = Buffer.from(arrBuf);
        }
      } catch (fetchErr) {
        console.warn('[Remove.bg] Could not fetch remote image url:', fetchErr);
      }
    } else {
      try {
        const cleanBase64 = imageBase64OrUrl.includes('base64,')
          ? imageBase64OrUrl.split('base64,')[1].trim()
          : imageBase64OrUrl.trim();
        processedBuffer = Buffer.from(cleanBase64, 'base64');
      } catch (b64Err) {
        console.warn('[Remove.bg] Base64 decode failed:', b64Err);
      }
    }

    if (processedBuffer && processedBuffer.length > 0) {
      formData.append(
        'image_file',
        new Blob([new Uint8Array(processedBuffer)], { type: 'image/png' }),
        'input.png'
      );
    } else if (imageBase64OrUrl.startsWith('http://') || imageBase64OrUrl.startsWith('https://')) {
      formData.append('image_url', imageBase64OrUrl);
    } else {
      return { ok: false, error: 'Unreadable image payload' };
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[Remove.bg] Note: API returned status', response.status, errText);
      return { ok: false, error: `Remove.bg status ${response.status}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Out = Buffer.from(arrayBuffer).toString('base64');
    return {
      ok: true,
      resultDataUrl: `data:image/png;base64,${base64Out}`,
    };
  } catch (err: any) {
    console.warn('[Remove.bg] Graceful fallback on error:', err?.message || err);
    return { ok: false, error: err?.message || 'Remove.bg unavailable' };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));


  // Authenticated image upload proxy: provider keys stay server-side.
  app.post('/api/image/upload', async (req, res) => {
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const caller = await verifyFirebaseToken(bearer);
    if (!caller) return res.status(401).json({ ok: false, error: 'Please sign in again before uploading an image.' });
    const image = typeof req.body?.image === 'string' ? req.body.image : '';
    if (!image.startsWith('data:image/') || !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(image)) {
      return res.status(400).json({ ok: false, error: 'Choose a valid PNG, JPG, WEBP, or GIF image.' });
    }
    if (image.length > 12 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Image is too large. Please use an image under 9 MB.' });
    if (!IMGBB_API_KEYS.length) return res.status(503).json({ ok: false, code: 'UPLOAD_NOT_CONFIGURED', error: 'Image hosting is not configured on this server (missing IMGBB_API_KEY_1).' });
    let lastError = 'Image upload failed.';
    for (const state of orderedImgbbKeys()) {
      try {
        const form = new URLSearchParams({ image: image.replace(/^data:image\/[^;]+;base64,/i, '') });
        const response = await fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(state.key), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          signal: AbortSignal.timeout(25000),
        });
        const result: any = await response.json().catch(() => null);
        if (response.ok && result?.success && result?.data?.url) {
          state.okCount += 1;
          return res.json({ ok: true, url: result.data.url, displayUrl: result.data.display_url, thumbUrl: result.data.thumb?.url || result.data.url });
        }
        lastError = String(result?.error?.message || 'Image provider rejected the upload.');
        // Rate limit / bad key: rest this key so the other one takes over.
        const limited = response.status === 429 || response.status === 400 || response.status === 403;
        state.errorCount += 1;
        state.cooldownUntil = Date.now() + (limited ? 5 * 60000 : 30000);
        console.warn(`[NEWARO IMG] key #${state.index + 1} HTTP ${response.status}: ${lastError}`);
      } catch (error: any) {
        state.errorCount += 1;
        state.cooldownUntil = Date.now() + 30000;
        lastError = error?.name === 'TimeoutError' ? 'Image upload timed out. Try again.' : 'Could not reach the image provider.';
      }
    }
    return res.status(502).json({ ok: false, error: lastError });
  });

  // Remove background API endpoint (non-blocking, safe response)
  app.post('/api/image/remove-background', async (req, res) => {
    try {
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const caller = await verifyFirebaseToken(bearer);
      if (!caller) return res.status(401).json({ ok: false, error: 'Please sign in again before using image tools.' });
      const { image, imageUrl } = req.body || {};
      const target = image || imageUrl;
      if (!target || typeof target !== 'string') {
        return res.json({ ok: false, error: 'Image data or URL is required' });
      }
      const result = await removeBackgroundWithApi(target);
      if (result.ok && result.resultDataUrl) {
        return res.json({
          ok: true,
          url: result.resultDataUrl,
          message: 'Background removed successfully using remove.bg AI',
        });
      }
      return res.json({
        ok: false,
        error: result.error || 'Could not remove background automatically',
      });
    } catch (err: any) {
      return res.json({ ok: false, error: err?.message || 'Server error' });
    }
  });

  // Unified Email Sending Endpoint
  app.post(['/api/send-email', '/api/email/send'], async (req, res) => {
    try {
      const { type, to, data = {} } = req.body || {};
      if (!type || !ALLOWED_EMAIL_TYPES.includes(type as EmailTemplateType)) {
        return res.status(400).json({ ok: false, error: 'Invalid email type' });
      }

      const rawRecipients = Array.isArray(to) ? to : [to];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const recipientList = rawRecipients
        .filter((r): r is string => typeof r === 'string')
        .map((r) => r.trim().toLowerCase())
        .filter((r) => emailRegex.test(r));

      if (recipientList.length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid recipient email provided' });
      }

      const rendered = renderEmailTemplate(type as EmailTemplateType, data);
      let sentCount = 0;
      for (const recipient of recipientList) {
        const sendResult = await sendEmailUnified({
          to: recipient,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        if (sendResult.ok) sentCount++;
      }

      return res.json({
        ok: true,
        sentCount,
        message: `Notification email dispatched to ${sentCount} recipient(s) via Gmail/Resend`,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to send email' });
    }
  });

  // Mass Broadcast Email Endpoint
  app.post('/api/email/broadcast', async (req, res) => {
    try {
      const { recipients = [], title, message, link, linkTitle, badge = 'ANNOUNCEMENT' } = req.body || {};
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validRecipients = Array.from(new Set(
        (Array.isArray(recipients) ? recipients : [recipients])
          .filter((r): r is string => typeof r === 'string')
          .map((r) => r.trim().toLowerCase())
          .filter((r) => emailRegex.test(r))
      ));

      if (validRecipients.length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid recipient email addresses provided' });
      }

      const emailSubject = title ? `[NEWARO] ${title}` : 'NEWARO Marketplace Notification';
      const buttonHtml = link ? `
        <div style="margin: 28px 0; text-align: center;">
          <a href="${link}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            ${linkTitle || 'View Details'} &rarr;
          </a>
        </div>
      ` : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NEWARO</h1>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Social Commerce & Freelance Platform · Nepal</p>
            </div>
            <div style="padding: 32px 32px 24px 32px;">
              <div style="display: inline-block; background-color: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                ${badge}
              </div>
              <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700; line-height: 1.3;">
                ${title || 'Platform Announcement'}
              </h2>
              <div style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-line;">
                ${message}
              </div>
              ${buttonHtml}
            </div>
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">Sent by NEWARO Marketplace Team from bishalxtha17@gmail.com</p>
              <p style="margin: 6px 0 0 0;">Kathmandu, Nepal · 100% Verified Stores · Cash on Delivery & Direct Freelancer Contracts</p>
            </div>
          </div>
        </body>
        </html>
      `;

      let sentCount = 0;
      for (const recipient of validRecipients) {
        try {
          const resUnified = await sendEmailUnified({
            to: recipient,
            subject: emailSubject,
            html: htmlContent,
            text: `${title}\n\n${message}\n\n${link ? `Link: ${link}` : ''}`,
          });
          if (resUnified.ok) sentCount++;
        } catch (err) {
          console.warn(`Failed broadcast to ${recipient}:`, err);
        }
      }

      return res.json({
        ok: true,
        sentCount,
        total: validRecipients.length,
        message: `Mass broadcast successfully delivered to ${sentCount} of ${validRecipients.length} recipients`,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Mass broadcast failed' });
    }
  });

  // Automated Weekly Insights & Goal Tracking AI Generator for Freelancers & Contractors
  // Weekly freelancer report. It uses ONLY the real numbers the app sends. Nothing is invented.
  app.post('/api/ai/freelancer-insights', async (req, res) => {
    try {
      const { contractorProfile, metrics, goals, alertThresholds } = req.body || {};
      if (!metrics || typeof metrics !== 'object' || Number(metrics.totalProposals) <= 0) {
        return res.status(400).json({ ok: false, error: 'No proposal activity on NEWARO yet. Send a proposal first.' });
      }
      const prompt = `
You are a performance analyst for NEWARO, a marketplace in Nepal. Write a weekly report for this freelancer using ONLY the numbers below.
Never invent figures. If a value is 0, null or "not collected yet", say there is no data for it yet.
Profile: ${JSON.stringify(contractorProfile || {})}
Real metrics from NEWARO records: ${JSON.stringify(metrics)}
Goals: ${JSON.stringify(goals || {})}
Alert thresholds: ${JSON.stringify(alertThresholds || {})}

Return JSON only, in this shape:
{
  "headline": "short headline",
  "summary": "two or three sentences that use the real numbers",
  "alertEvaluations": [{"metric": "name", "status": "healthy" or "warning" or "critical", "message": "comparison with the threshold"}],
  "actionableRecommendations": ["recommendation 1", "recommendation 2"],
  "projectedMonthEndNpr": null
}
`;
      const aiRes = await generateWithGeminiFailover({
        prompt,
        systemInstruction: 'You are a careful analyst. Use only the numbers you are given. Return valid JSON only.',
        jsonMode: true,
      });
      if (aiRes.ok) {
        try {
          return res.json({ ok: true, report: JSON.parse(aiRes.text) });
        } catch {
          // Not valid JSON: reported as unavailable below
        }
      }
      return res.json({ ok: false, error: 'The AI report is not available right now. Try again later.' });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to generate report' });
    }
  });

  // NEWARO AI health check. Shows how many keys are ready. It never shows the keys themselves.
  app.get('/api/ai/health', (_req, res) => {
    const now = Date.now();
    res.json({
      ok: true,
      authCheck: 'google-certificates',
      firebaseProject: FIREBASE_PROJECT_ID,
      keysConfigured: geminiKeyStates.length,
      keysReady: geminiKeyStates.filter((k) => k.cooldownUntil <= now).length,
      lastErrors: Object.fromEntries([...geminiLastErrors.entries()].map(([i, m]) => [`key${i + 1}`, m])),
      imageKeysConfigured: imgbbKeyStates.length,
      imageKeysReady: imgbbKeyStates.filter((k) => k.cooldownUntil <= now).length,
    });
  });

  // NEWARO AI assistant. Answers from the real catalog first, but can answer any question
  // and can look at an uploaded photo (faces, objects, text, scene). It never identifies people.
  app.post(['/api/ai/chat', '/api/ai/assistant'], async (req, res) => {
    try {
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const caller = await verifyFirebaseToken(bearer);
      if (!caller) {
        return res.status(401).json({
          ok: false,
          reply: 'Please sign in with Google to chat with NEWARO AI.',
          productIds: [],
        });
      }
      if (aiUserLimited(caller.uid)) {
        return res.status(429).json({
          ok: false,
          reply: 'You are asking very quickly. Please wait a minute and try again.',
          productIds: [],
        });
      }

      const body = req.body || {};
      let message = clipText(body.message || body.prompt, 500);

      // Optional photo
      let imagePart: GeminiImagePart | null = null;
      if (typeof body.image === 'string' && body.image) {
        const m = body.image.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
        if (!m) {
          return res.status(400).json({ ok: false, reply: 'Choose a valid PNG, JPG, WEBP, or GIF image.', productIds: [] });
        }
        if (body.image.length > 14 * 1024 * 1024) {
          return res.status(413).json({ ok: false, reply: 'That image is too large. Please use one under 9 MB.', productIds: [] });
        }
        imagePart = { mimeType: m[1].toLowerCase().replace('jpg', 'jpeg'), data: m[2] };
        if (!message) message = 'Analyse this photo in detail.';
      }
      if (!message) {
        return res.status(400).json({ ok: false, reply: 'Type a question to get started.', productIds: [] });
      }

      const catalog: CatalogLine[] = (Array.isArray(body.catalog) ? body.catalog : [])
        .slice(0, 80)
        .map(
          (p: any): CatalogLine => ({
            id: clipText(p?.id, 128),
            name: clipText(p?.name, 120),
            price: toPositiveNumber(p?.price),
            originalPrice: toPositiveNumber(p?.originalPrice),
            category: clipText(p?.category, 60),
            shop: clipText(p?.shopName, 80),
            stock: toPositiveNumber(p?.stock),
            about: clipText(p?.description, 160),
          })
        )
        .filter((p: CatalogLine) => p.id && p.name);

      const knownIds = new Set<string>(catalog.map((p: CatalogLine) => p.id));
      const history: string[] = (Array.isArray(body.history) ? body.history : [])
        .slice(-6)
        .map((h: any) => {
          const text = clipText(h?.text, 300);
          return text ? `${h?.role === 'assistant' ? 'NEWARO AI' : 'Customer'}: ${text}` : '';
        })
        .filter(Boolean);

      const systemInstruction = [
        'You are NEWARO AI, the assistant built into the NEWARO social-commerce website and app in Nepal.',
        'You can answer ANY question like a general AI assistant (study, coding, health basics, travel, business, writing, translation, maths), but your focus is NEWARO: its products, prices, shops, orders, jobs, events and features.',
        'For anything about NEWARO products, prices, stock and shop names, use ONLY the catalog you are given. Never invent a NEWARO product, price, shop or photo.',
        'If the customer asks for a NEWARO item that is not in the catalog, say it is not listed on NEWARO yet and suggest the closest listed items.',
        'Prices are in Nepali rupees, written as Rs. followed by the amount with commas. Cash on Delivery is supported.',
        'When the customer asks for the best item, a recommendation, something to buy, or a price, put the matching catalog ids in productIds (up to 6). Otherwise leave productIds empty.',
        'Never recommend or mention other shopping websites or apps.',
        'If the customer writes in Nepali or asks for Nepali, reply in Nepali (Devanagari script). Otherwise reply in English.',
        'Keep simple answers to 2 to 5 short sentences. For general-knowledge or detailed questions you may write up to about 200 words. Use plain text with no markdown symbols.',
        'PHOTO RULES: Be precise and literal. Only report what is clearly visible; say "unclear" instead of guessing. Count faces carefully and include small or partly hidden ones. Read visible text exactly as written.',
        'PRIVACY: Never state who a person is, never match a face to a name (not even a celebrity), and never infer race, ethnicity, religion, health, disability, sexuality or political views. If asked who someone is, say you cannot identify people but describe what is visible. Apparent age is only a rough range.',
        `NEWARO site guide: ${NEWARO_SITE_GUIDE}`,
      ].join('\n');

      const catalogText = catalog.length
        ? JSON.stringify(
            catalog.map((p: CatalogLine) => ({
              id: p.id,
              name: p.name,
              price: `Rs. ${p.price}`,
              originalPrice: p.originalPrice ? `Rs. ${p.originalPrice}` : null,
              category: p.category,
              shop: p.shop,
              stock: p.stock,
              about: p.about,
            }))
          )
        : 'The catalog is empty right now.';

      const analysisShape = imagePart
        ? ', "analysis": {"summary": "2-3 sentence description of the whole image", "faceCount": 0, "faces": [{"position": "left/centre/right, front/back", "expression": "e.g. smiling, neutral", "apparentAgeRange": "e.g. 25-35 or unclear", "hair": "colour and style", "facialHair": "none/beard/moustache", "glasses": "none/glasses/sunglasses", "headwear": "none or what", "clarity": "clear/partial/small/blurred"}], "objects": ["main objects"], "visibleText": ["exact text seen in the image"], "scene": "place or setting", "dominantColors": ["colour"], "productMatch": "what product this looks like, or empty"}'
        : '';

      const prompt = [
        'NEWARO catalog (real listings, the only NEWARO products that exist):',
        catalogText,
        '',
        'Recent conversation:',
        history.length ? history.join('\n') : '(none yet)',
        '',
        imagePart ? 'The customer attached a photo (see image). Answer their message about it.' : '',
        `Customer message: "${message}"`,
        '',
        `Return ONLY valid JSON in this shape: {"reply": "your answer", "productIds": ["catalog id"]${analysisShape}}`,
        'Use an empty productIds array when no catalog item fits.',
      ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n');

      const aiRes = await generateWithGeminiFailover({
        prompt,
        systemInstruction,
        jsonMode: true,
        images: imagePart ? [imagePart] : undefined,
      });

      if (aiRes.ok) {
        try {
          const cleaned = aiRes.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const rawIds: unknown[] = Array.isArray(parsed?.productIds) ? parsed.productIds : [];
          const productIds: string[] = [...new Set(rawIds.map((id) => String(id)))]
            .filter((id) => knownIds.has(id))
            .slice(0, 6);

          let analysis: Record<string, unknown> | undefined;
          if (imagePart && parsed?.analysis && typeof parsed.analysis === 'object') {
            const an = parsed.analysis;
            const list = (v: unknown, n: number, len: number): string[] =>
              (Array.isArray(v) ? v : []).map((x: unknown) => clipText(x, len)).filter(Boolean).slice(0, n);
            const faces = (Array.isArray(an.faces) ? an.faces : []).slice(0, 12).map((f: any) => ({
              position: clipText(f?.position, 40),
              expression: clipText(f?.expression, 40),
              apparentAgeRange: clipText(f?.apparentAgeRange, 20),
              hair: clipText(f?.hair, 60),
              facialHair: clipText(f?.facialHair, 40),
              glasses: clipText(f?.glasses, 30),
              headwear: clipText(f?.headwear, 40),
              clarity: clipText(f?.clarity, 20),
            }));
            analysis = {
              summary: clipText(an.summary, 500),
              faceCount: Number.isFinite(Number(an.faceCount)) ? Math.max(0, Math.min(50, Math.round(Number(an.faceCount)))) : faces.length,
              faces,
              objects: list(an.objects, 12, 40),
              visibleText: list(an.visibleText, 12, 120),
              scene: clipText(an.scene, 100),
              dominantColors: list(an.dominantColors, 6, 24),
              productMatch: clipText(an.productMatch, 100),
            };
          }
          return res.json({
            ok: true,
            reply: clipText(parsed?.reply, 2000) || 'Here is what I found on NEWARO.',
            productIds,
            ...(analysis ? { analysis } : {}),
          });
        } catch {
          return res.json({ ok: true, reply: clipText(aiRes.text, 2000), productIds: [] });
        }
      }

      console.warn('[NEWARO AI] unavailable:', aiRes.error);
      const notConfigured = geminiKeyStates.length === 0;
      return res.json({
        ok: false,
        notConfigured,
        reply: notConfigured
          ? 'NEWARO AI is not set up on this server yet. The owner needs to add GEMINI_API_KEY to the server environment.'
          : 'The NEWARO AI could not answer right now. Please try again in a moment.',
        detail: notConfigured ? '' : String(aiRes.error || '').slice(0, 200),
        productIds: [],
      });
    } catch (err: any) {
      console.error('[NEWARO AI] route error:', err?.message || err);
      return res.status(500).json({ ok: false, reply: 'Something went wrong. Please try again.', productIds: [] });
    }
  });

  // Find by photo: Gemini looks at the picture and matches NEWARO listings. It never identifies people.
  app.post('/api/ai/find-by-image', async (req, res) => {
    try {
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const caller = await verifyFirebaseToken(bearer);
      if (!caller) return res.status(401).json({ ok: false, error: 'Please sign in to use Find by Photo.' });
      if (aiUserLimited(caller.uid)) return res.status(429).json({ ok: false, error: 'Too many requests. Wait a minute and try again.' });
      const image = typeof req.body?.image === 'string' ? req.body.image : '';
      const m = image.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
      if (!m) return res.status(400).json({ ok: false, error: 'Choose a valid PNG, JPG, WEBP, or GIF image.' });
      if (image.length > 12 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Image is too large.' });
      const catalog = (Array.isArray(req.body?.catalog) ? req.body.catalog : []).slice(0, 120).map((p: any) => ({
        id: clipText(p?.id, 128),
        name: clipText(p?.name, 100),
        category: clipText(p?.category, 50),
        shop: clipText(p?.shopName, 60),
        about: clipText(p?.description, 100),
      })).filter((p: any) => p.id && p.name);
      const knownIds = new Set(catalog.map((p: any) => p.id));
      const prompt = [
        'Look at the photo. Describe the main object or product in it (what it is, colour, material, style).',
        'Privacy: never identify a person, match a face to a name, infer sensitive traits, or describe facial identity. You may report whether a face/person is visible and count clearly visible people when useful. If the image is primarily a person portrait rather than a product, set item to "person photo" and matchedIds to [].',
        'Then pick the listings from this NEWARO catalog that best match the photo (up to 6, best first). Use only ids from the catalog.',
        'Catalog: ' + JSON.stringify(catalog),
        'Return ONLY JSON: {"item": "short name", "description": "one sentence", "keywords": ["word"], "category": "best category", "matchedIds": ["id"]}',
      ].join('\n');
      const ai = await generateWithGeminiFailover({
        prompt,
        systemInstruction: 'You are the visual product finder for NEWARO, a marketplace in Nepal. Return valid JSON only. Never identify people.',
        jsonMode: true,
        images: [{ mimeType: m[1].toLowerCase().replace('jpg', 'jpeg'), data: m[2] }],
      });
      if (!ai.ok) return res.json({ ok: false, error: 'The AI could not look at this photo right now. Please try again in a minute.' });
      try {
        const parsed = JSON.parse(ai.text);
        const matchedIds = (Array.isArray(parsed?.matchedIds) ? parsed.matchedIds : []).map((x: unknown) => String(x)).filter((id: string) => knownIds.has(id)).slice(0, 6);
        return res.json({
          ok: true,
          item: clipText(parsed?.item, 80),
          description: clipText(parsed?.description, 240),
          keywords: (Array.isArray(parsed?.keywords) ? parsed.keywords : []).map((k: unknown) => clipText(k, 30)).filter(Boolean).slice(0, 8),
          category: clipText(parsed?.category, 60),
          matchedIds,
        });
      } catch {
        return res.json({ ok: false, error: 'The AI gave an unreadable answer. Please try again.' });
      }
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
    }
  });

  // Description generation helper
  app.post('/api/ai/generate-description', async (req, res) => {
    try {
      const { title, category, type, keywords } = req.body || {};
      const prompt = `Write a concise, compelling 2-sentence description for a ${type || 'product'} on NEWARO Nepal. Title: "${title}" Category: "${category || 'General'}" Details: "${keywords || ''}". Return only the description without quotes.`;
      const result = await generateWithGeminiFailover({ prompt });
      if (result.ok && result.text) {
        return res.json({ text: result.text });
      }
      return res.json({
        text: `Authentic ${title || 'item'} in ${category || 'Nepal'}. Available for order with Cash on Delivery across Nepal.`,
      });
    } catch {
      return res.json({ text: 'High quality item available on NEWARO with Cash on Delivery.' });
    }
  });

  // AI Product Title, Category, Price & Description Generator from Image
  app.post('/api/ai/generate-product-from-image', async (req, res) => {
    try {
      const { imageUrl, imageHint, existingName, categoryHint } = req.body || {};
      const prompt = `
You are an e-commerce catalog specialist for the NEWARO marketplace in Nepal. Analyze the product described or shown:
Image URL / Data: ${imageUrl ? imageUrl.slice(0, 150) : 'Uploaded product image'}
Context Hint: ${imageHint || existingName || 'New product'}
Category Hint: ${categoryHint || 'Auto-detect'}

Generate a professional, high-converting product listing formatted strictly as JSON:
{
  "name": "Catchy, professional product title (30-60 characters, e.g. Men's Slim Fit Cotton Chino Pants)",
  "description": "Engaging, persuasive 2-3 paragraph description highlighting quality, materials, style, and Cash on Delivery in Nepal.",
  "category": "one of: ${NEWARO_CATEGORIES.join(' | ')}",
  "suggestedPriceNpr": 1500,
  "suggestedOriginalPriceNpr": 2000,
  "tags": ["trendy", "premium", "durable"]
}
`;

      const result = await generateWithGeminiFailover({
        prompt,
        systemInstruction: 'You are an expert e-commerce catalog copywriter for Nepal. Return only valid JSON.',
        jsonMode: true,
      });

      if (result.ok && result.text) {
        try {
          const parsed = JSON.parse(result.text);
          return res.json({ ok: true, data: parsed });
        } catch {
          // fallback
        }
      }

      return res.status(503).json({ ok: false, error: 'AI product research is unavailable. Check server Gemini configuration and try again.' });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to generate product details' });
    }
  });

  // Admin action proxy
  app.post('/api/admin/action', async (req, res) => {
    try {
      const { action, collectionName, docId, data } = req.body || {};
      const { caller } = await resolveCallerFromRequest(req);
      const isCallerAdmin = caller?.email ? isAdmin(caller.email) : false;

      if (!isCallerAdmin) {
        return res.status(403).json({ ok: false, error: 'Unauthorized: Admin credentials required' });
      }

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}/${docId}`;

      if (action === 'delete') {
        const delRes = await fetch(firestoreUrl, { method: 'DELETE' });
        return res.json({ ok: true, status: delRes.status });
      }

      if (action === 'update' || action === 'patch') {
        const fields: Record<string, any> = {};
        const updateMaskFields: string[] = [];
        for (const [key, val] of Object.entries(data || {})) {
          updateMaskFields.push(key);
          if (typeof val === 'string') fields[key] = { stringValue: val };
          else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
          else if (typeof val === 'number') {
            if (Number.isInteger(val)) fields[key] = { integerValue: String(val) };
            else fields[key] = { doubleValue: val };
          } else if (val === null) fields[key] = { nullValue: null };
          else fields[key] = { stringValue: JSON.stringify(val) };
        }

        const maskQuery = updateMaskFields.map((f) => `updateMask.fieldPaths=${f}`).join('&');
        const patchUrl = `${firestoreUrl}?${maskQuery}`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
        return res.json({ ok: true, status: patchRes.status });
      }

      return res.status(400).json({ ok: false, error: 'Invalid action' });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
    }
  });

  // Mount Vite or static dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEWARO Server running on http://localhost:${PORT}`);
  });
}

const isMainModule =
  Boolean(process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')));
if (isMainModule) {
  startServer();
}
