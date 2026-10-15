# NEWARO — Professional Commerce Gap Analysis & Release Plan

Audit target: supplied `NEWARO-v24` source archive. This is a source-level review, not a live-site penetration test or production certification.

## Executive summary

The project already contains a React + TypeScript application, Firebase integration points, shop/product/order/cart/notification screens, and server email templates. Product types already contain some useful fields (including `variants`, `sku`, `stock`, `specifications`), and checkout already has delivery modes and platform fee settings.

However, the presence of a screen, type, or helper does **not** prove the full feature works end-to-end. The supplied package itself says a production build, live-provider tests, Firestore rules audit, email delivery test, load test, and end-to-end UI test were not run. Treat the release as **not yet production-ready** until the gates below pass.

## Highest-priority gaps to address

1. **Product variants:** complete size/color selectors and variant-specific stock, SKU, price, and images; validate the selected variant before adding to cart and at checkout.
2. **Media uploads:** enforce size/type limits, compress images, handle failures/retries, and avoid exposing upload-provider secrets in browser code.
3. **Shop QR:** generate a QR for each canonical shop URL, allow PNG/SVG download and printable poster, and optionally record privacy-respecting scan analytics.
4. **Payments:** clearly label COD, bank transfer, and online payment options. Real eSewa/Khalti/Fonepay payment requires server-side initiation/verification, signed webhooks, idempotency, reconciliation, and refunds. A displayed QR or payment reference alone is not verified payment.
5. **Email notifications:** test buyer/seller order emails, payment/status changes, shop approval, verification, retries, bounce/error logging, preference controls, and unsubscribe where required. Never trust a client request alone to send privileged transactional email.
6. **Order correctness:** recalculate prices, shipping, discounts, stock and seller ownership on a trusted server; use transactions/atomic stock changes and idempotency to prevent duplicate orders or overselling.
7. **Firestore security:** audit every collection and query against actual app data; deploy least-privilege rules and test both allowed and denied access with the Firebase Emulator.
8. **Admin and seller permissions:** enforce roles on the server and in Firestore rules, not merely by hiding buttons in the UI.
9. **Privacy and legal pages:** publish accurate terms, privacy, returns/refunds, shipping, contact/support, and account deletion/data request flows as applicable.
10. **Operations:** configure staging and production separately, secrets and environment validation, backups/restore drills, error monitoring, rate limits, dependency scanning, and rollback.
11. **Testing:** run install, typecheck, lint, build, Firebase emulator tests, payment sandbox tests, email delivery tests, and end-to-end buyer/seller/admin journeys.
12. **Performance and accessibility:** paginate large lists, optimize images, test mobile layouts, keyboard use, focus states, contrast, and poor-network states.

## Feature inventory

The accompanying `FEATURE_GAP_CHECKLIST.md` lists 222 professional-commerce features across products, variants, storefronts, QR, checkout, payment, email, search, trust, admin, security, QA and operations. These are a roadmap/checklist, not a claim that all 222 have been implemented. Mark each item `Existing + verified`, `Partial`, `Missing`, or `Not applicable` after testing the actual running deployment.

## Suggested implementation order

- **P0 — Security and correctness:** secret rotation, Firestore rules, server authorization, trusted order totals, stock transactions, input/upload validation, environment validation.
- **P1 — Commerce essentials:** size/color variants end-to-end, inventory, shipping/address validation, order lifecycle, receipts, COD, shop QR.
- **P2 — Payments and notifications:** integrate payment provider(s) in sandbox, webhook verification, reconciliation/refunds, transactional email delivery and retries.
- **P3 — Professional polish:** SEO, filters, accessibility, analytics, moderation, support, seller reports, backups/monitoring.
- **P4 — Scale:** load tests, queues, caching, database indexes, rate limits, CDN/image pipeline, recovery drills.

## Release gates (must pass before calling it production-ready)

- [ ] Remove/revoke any previously exposed credentials; keep secrets server-side and out of Git/ZIP.
- [ ] Copy `.env.example` to `.env.local` locally and configure fresh credentials.
- [ ] Confirm Firebase Auth providers and authorized domains.
- [ ] Review and test `firestore.rules` against all collections and user roles.
- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run check:syntax` passes.
- [ ] `npm run audit:auth-upload` passes and findings are resolved.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Test buyer, seller, and admin flows on mobile and desktop.
- [ ] Test order totals and stock under concurrent checkout.
- [ ] Test payment success, failure, cancellation, duplicate webhook, and refund in provider sandbox.
- [ ] Test email delivery, retry, preference suppression, and failure reporting.
- [ ] Verify backups can be restored and rollback works.
- [ ] Run dependency/security scans and load tests appropriate to expected traffic.
- [ ] Verify privacy, terms, shipping, return/refund and support content.

## Important security note

The supplied archive included `.env.local`; it has been intentionally excluded from this release ZIP. If the original file contained real credentials, deleting it from this ZIP does not revoke those credentials. Rotate exposed secrets and check repository history/hosting logs. The public Firebase web config is not a substitute for restrictive Firestore rules. Never put Gemini, email, payment-provider or upload-provider secrets in `VITE_*` variables.
