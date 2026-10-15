# NEWARO v24 — Upload and Deployment Steps

## A. Extract and prepare
1. Download `NEWARO-v24-FINAL-PREUPLOAD-PACKAGE.zip` and extract it.
2. Open the extracted `NEWARO-v24` folder in VS Code.
3. Read `README.md`, `PRODUCTION_GAP_ANALYSIS.md`, and `PRE_UPLOAD_CHECKLIST.md` first.
4. Do not add `.env.local` to the repository. Start from `.env.example` and fill in fresh values locally.

On macOS Terminal:

```bash
cd /path/to/NEWARO-v24
cp .env.example .env.local
npm ci
npm run check:syntax
npm run audit:auth-upload
npm run lint
npm run build
```

If any command fails, fix the issue and rerun the checks before continuing.

## B. Configure secrets and services
1. Create/confirm the production Firebase project.
2. Configure Firebase Authentication, Firestore, and Storage rules and test permissions.
3. Create fresh server-side provider keys as needed (Gemini, email, image hosting, etc.).
4. Add private server variables in the hosting dashboard. Do not commit secret values or put server secrets in `VITE_*` variables.
5. Configure sender domain and email DNS records with your email provider.
6. Configure payment gateway sandbox credentials and callbacks first; enable live payments only after full verification.

## C. Upload to GitHub
1. Create a **private** repository initially if the code contains business logic you do not want public.
2. Confirm `.env.local`, service-account files, private keys, `node_modules`, and build output are not tracked.
3. Review `git status` and inspect staged files before committing.
4. Commit and push source code only after local checks pass.
5. If a secret was committed in the past, deleting it from the latest commit is not enough—rotate/revoke it.

Example commands:

```bash
git init
git add .
git status
# Inspect staged files carefully before proceeding
git commit -m "Prepare NEWARO v24 release"
git branch -M main
git remote add origin YOUR_PRIVATE_GITHUB_REPOSITORY_URL
git push -u origin main
```

If the repository already exists, do not run `git init` or add a second remote; follow your repository's normal workflow.

## D. Deploy to a compatible Node host
1. Select a Node.js hosting service that supports a long-running Express server, environment variables, and the required Node version.
2. Connect the GitHub repository.
3. Set build command to `npm ci && npm run build`.
4. Set start command to `npm run start:prod`.
5. Add required environment variables securely in the hosting dashboard.
6. Deploy to a preview/staging URL first.
7. Check logs, routes, APIs, auth, image uploads, payment test flow, and email delivery.

**Important:** GitHub Pages and other static-only hosting do not run `server.ts`. If you choose a static/edge platform, the Express backend must be adapted to that platform and tested separately before launch.

## E. Connect your domain
1. Add the domain in the hosting provider's dashboard first and copy the exact DNS records it supplies.
2. Add those records at your DNS provider; do not guess A, CNAME, or nameserver values.
3. Wait for DNS and HTTPS certificate provisioning.
4. Set the preferred canonical hostname and redirect the alternate hostname if supported.
5. Add the final hostname to Firebase Authentication authorized domains and any provider callback/allowed-origin settings.
6. Test the HTTPS domain on desktop and mobile.

## F. Go live only after verification
Complete `PRE_UPLOAD_CHECKLIST.md`. Run a controlled test order and verify stock, payment status, email, order state, and seller/admin visibility. Keep backups and a rollback plan. Do not label NEWARO production-ready merely because it builds or opens in a browser.
