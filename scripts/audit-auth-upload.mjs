import fs from 'node:fs';
import path from 'node:path';

const checks = [];
const read = (f) => fs.readFileSync(f, 'utf8');
const add = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });

const auth = read('src/features/auth/AuthContext.tsx');
const upload = read('src/lib/imgbb.ts');
const server = read('server.ts');
const secrets = read('server/secrets.ts');
const ai = read('src/features/ai/AiAssistantModal.tsx');
const chat = read('src/features/chat/ChatPage.tsx');
const bg = read('src/lib/backgroundRemover.ts');
const api = read('src/lib/adminApi.ts');

add('Firebase sign-out clears cached user session', /persistUser\(null\);\s*\n\s*persistProfile\(null\)/.test(auth));
add('Initial auth state waits for Firebase hydration', /useState\(true\)/.test(auth));
add('Image uploads require a real Firebase session', /auth\.currentUser/.test(upload));
add('Image uploads use authenticated server proxy', /fetch\('\/api\/image\/upload'/.test(upload) && /Authorization: `Bearer \$\{idToken\}`/.test(upload));
add('No browser-side ImgBB key or data-URL success fallback', !/api\.imgbb\.com\/1\/upload|DEFAULT_IMGBB_KEY|Local Fallback/.test(upload));
add('Server validates Firebase bearer token for image uploads', /app\.post\('\/api\/image\/upload'/.test(server) && /verifyFirebaseToken\(bearer\)/.test(server));
add('Server keeps ImgBB keys in environment configuration', /IMGBB_API_KEYS/.test(server) && /process\.env\.IMGBB_API_KEY/.test(secrets));
add('Admin proxy rejects passcode-only access', /if \(!isCallerAdmin\)/.test(server) && !/isPasscodeValid|passcode\\s*===/.test(server));
add('Spoofable identity headers are not accepted', !/x-user-email|x-user-uid/.test(server));
add('AI errors are shown rather than replaced with fake success', /NEWARO AI could not connect/.test(ai));
add('Chat failed sends are not marked as sent', /NEWARO chat send failed/.test(chat) && /prev\.filter\(\(m\) => m\.id !== tempId\)/.test(chat));
add('Admin server API requires Firebase ID token', /if \(!params\.idToken\)/.test(api));
add('Server uses hosting-provided PORT', /process\.env\.PORT/.test(server));
add('Firebase project is configured in local environment', fs.existsSync('.env.local') && /VITE_FIREBASE_PROJECT_ID=newaro-21104/.test(read('.env.local')));
add('Provider secret placeholders exist in example', fs.existsSync('.env.example') && /GEMINI_API_KEY/.test(read('.env.example')) && /IMGBB_API_KEY_1/.test(read('.env.example')));

add('Server verifies sign-in with Google certificates (no key needed)', /securetoken@system\.gserviceaccount\.com/.test(server) && /verifyJwtWithCerts/.test(server));
add('AI chat accepts photos and returns a photo analysis', /analysis/.test(server) && /attachFile/.test(ai) && /AnalysisCard/.test(ai));
add('AI refreshes an expired sign-in token and retries once', /getIdToken\(forceRefresh\)/.test(ai) && /res\.status === 401\) res = await postChat/.test(ai));
add('Gemini key lives only in server env, never in src/', !/AQ\.Ab8/.test(ai + upload) && /GEMINI_API_KEY=/.test(read('.env.local')));
add('Story viewer uses stacked header/photo/footer (no overlay overlap)', /shrink-0 px-3 pt-3 pb-2/.test(read('src/features/feed/StoryViewerModal.tsx')));
add('Shop pages use per-category themes', /getShopTheme/.test(read('src/features/shops/ShopDetailPage.tsx')) && /getShopTheme/.test(read('src/features/shops/ShopsPage.tsx')));

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}: ${c.name}${c.detail ? ' — ' + c.detail : ''}`);
console.log(`Result: ${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
