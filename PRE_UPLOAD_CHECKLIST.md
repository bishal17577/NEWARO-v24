# NEWARO v24 — Final Pre-Upload Checklist

This checklist is the gate to follow before publishing NEWARO. The included feature-gap list is a roadmap and audit checklist; it does **not** mean all 222 items are already implemented. Do not advertise the site as production-ready until every required release gate below passes.

## 1. Protect keys and user data
- [ ] Confirm `.env.local` is not in the ZIP, Git repository, or deployment artifact.
- [ ] If any real key was ever included in a ZIP or pushed to Git, revoke/rotate it before deployment.
- [ ] Keep private keys server-side only. Never use `VITE_` for Gemini, Resend, Gmail, ImgBB, or other secret keys.
- [ ] Set all required environment variables in the hosting provider's private environment settings.
- [ ] Check Firebase Firestore and Storage rules deny unauthorized reads/writes; test both allowed and denied cases.
- [ ] Confirm admin privileges are verified on the server/backend, not only hidden in the UI.
- [ ] Use test accounts and test payment credentials; never put real customer data into development tests.

## 2. Run checks locally on macOS
Open Terminal in the extracted `NEWARO-v24` folder:

```bash
node --version
npm --version
npm ci
npm run check:syntax
npm run audit:auth-upload
npm run lint
npm run build
```

- [ ] Fix every error; do not deploy if a command fails.
- [ ] Run the app with `npm run dev` and test in a desktop browser and on a phone-sized viewport.
- [ ] Test a clean session and a signed-in session.
- [ ] Check browser console and server terminal for errors.
- [ ] Check all navigation, forms, loading states, empty states, error states, and mobile layouts.

## 3. Product and shop test
- [ ] Create/edit/archive a shop using a test account.
- [ ] Upload valid product images; test unsupported file types and oversized files.
- [ ] Create a product with size and color variants, unique SKU/stock per variant, and different prices if supported.
- [ ] Confirm stock decreases only after a valid order and does not become negative under repeat/parallel checkout.
- [ ] Confirm shop QR and product QR open the correct public page; scan on a second phone.
- [ ] Verify product search, filters, cart quantity, wishlist, reviews, and product detail pages that are present.

## 4. Checkout, payment, order and refund test
- [ ] Test cash on delivery if enabled.
- [ ] Test each enabled payment gateway in its sandbox/test environment.
- [ ] Verify payment status server-side using the provider's verification API/webhook; never trust a client redirect or screenshot alone.
- [ ] Test failed, cancelled, pending, duplicate, and successful payment events.
- [ ] Confirm order totals, shipping, fees, discounts, taxes (if applicable), and rounding are correct.
- [ ] Test order confirmation, seller notification, cancellation, refund/return workflow, and invoice details.
- [ ] Do not enable a gateway in production until its credentials, callback URL, webhook signature, reconciliation, and refund process are verified.

## 5. Email and notification test
- [ ] Verify sender/domain with the chosen email provider and set SPF/DKIM/DMARC as recommended by that provider.
- [ ] Test email verification, password reset, order confirmation, shipment/delivery, cancellation/refund, and seller/admin alerts where implemented.
- [ ] Check spam folder, mobile formatting, broken links, and wrong/missing order details.
- [ ] Ensure notification failures are logged and retryable; avoid sending duplicate emails on webhook retries.
- [ ] Do not claim an email was delivered merely because an API request was accepted; inspect provider delivery events.

## 6. Firebase and domain configuration
- [ ] Confirm the correct Firebase project is being used for production.
- [ ] Enable only the sign-in methods you support.
- [ ] Add the production domain to Firebase Authentication's authorized domains.
- [ ] Review `firestore.rules` against every collection and role, then deploy only after testing.
- [ ] Test account creation, sign-in/out, password reset, user permissions, and account deletion/data handling.
- [ ] Configure HTTPS, canonical domain, redirects, DNS, and error/404 behavior.
- [ ] Review `robots.txt`, `sitemap.xml`, page titles, descriptions, Open Graph previews, and favicon.

## 7. Choose compatible hosting
NEWARO includes an Express server (`server.ts`) as well as a Vite frontend. Use a Node.js host that supports the app's server process and environment variables, or adapt and separately test the backend for a serverless/edge platform. A static-only host (for example, GitHub Pages) will not automatically run Express API routes.

Typical build command:

```bash
npm ci && npm run build
```

Typical start command for a Node host:

```bash
npm run start:prod
```

- [ ] Confirm the host supports the Node version and start command.
- [ ] Set environment variables privately in the host dashboard.
- [ ] Configure the host's port/health check according to its documentation.
- [ ] Test the deployed site on its preview/staging URL before connecting the main domain.
- [ ] Verify frontend routes, API routes, uploads, AI calls, email, and Firebase work after deployment.

## 8. Final release gate
- [ ] No known critical/high security issue remains.
- [ ] All required test commands pass and the production build succeeds.
- [ ] Payment, auth, upload, Firestore permissions, and emails have been tested end-to-end.
- [ ] Privacy policy, terms, return/refund, shipping/delivery, and contact/support information are published and accurate.
- [ ] Backups and a restore procedure exist for important data.
- [ ] Monitoring/error alerts and a rollback plan are ready.
- [ ] A real buyer and seller test order completes successfully in a controlled test environment.
- [ ] Record release date, commit/version, known limitations, and person responsible for rollback.

**Launch rule:** If a critical gate is unchecked, keep the site in staging or maintenance mode. A ZIP can be prepared, but production readiness can only be confirmed after running the checks in the actual deployment environment.
