# NEWARO Feature Gap Checklist (222 items)

**How to use:** This is a complete planning checklist, not a statement that every item is absent. The ZIP source has not been live-tested; mark each row after checking the running application and backend.

Status key: `[ ] Not verified` → change to `[x] Existing + verified`; annotate `Partial`, `Missing`, or `N/A` where appropriate.

## Product catalogue & variants

- [ ] Product image gallery with multiple images
- [ ] Image upload size limits and file-type validation
- [ ] Image compression and responsive thumbnails
- [ ] Product video support
- [ ] Product name and long description
- [ ] SKU / barcode field
- [ ] Brand and manufacturer
- [ ] Category and subcategory
- [ ] Tags and searchable attributes
- [ ] Product condition (new/used/refurbished)
- [ ] Product visibility: draft/published/archived
- [ ] Product moderation and approval
- [ ] Price and compare-at price
- [ ] Cost price and profit margin (seller-only)
- [ ] Stock quantity and low-stock threshold
- [ ] Out-of-stock behavior
- [ ] Backorder / preorder setting
- [ ] Size variants (XS–XXL/custom)
- [ ] Color variants with swatches
- [ ] Variant-specific SKU
- [ ] Variant-specific price
- [ ] Variant-specific stock
- [ ] Variant-specific image
- [ ] Weight and dimensions
- [ ] Warranty and return eligibility
- [ ] Shipping class
- [ ] Bulk product import/export CSV
- [ ] Duplicate product
- [ ] Bulk edit products
- [ ] Scheduled publish
- [ ] Product change history
- [ ] Product SEO title/description/slug
- [ ] Structured product data for search engines
- [ ] Product availability badge
- [ ] Related products
- [ ] Frequently bought together
- [ ] Recently viewed products
- [ ] Wishlist
- [ ] Product comparison
- [ ] Q&A on product page
- [ ] Verified-purchase reviews
- [ ] Review photos and moderation
- [ ] Report product

## Storefront & seller tools

- [ ] Custom shop name and unique URL/slug
- [ ] Shop logo and cover upload
- [ ] Shop profile and business details
- [ ] Shop location pin/map link
- [ ] Opening hours and holiday hours
- [ ] Shop QR code linking to storefront
- [ ] Download/print shop QR poster
- [ ] QR analytics and scan counts
- [ ] Shop verification workflow
- [ ] Shop status: pending/approved/suspended
- [ ] Seller dashboard KPIs
- [ ] Seller order queue
- [ ] Seller inventory dashboard
- [ ] Low-stock alerts
- [ ] Seller sales reports
- [ ] Sales export CSV
- [ ] Seller payout ledger
- [ ] Commission and fee breakdown
- [ ] Seller shipping settings
- [ ] Pickup availability and instructions
- [ ] Seller return/refund policy
- [ ] Shop announcement banner
- [ ] Shop social links
- [ ] Shop followers
- [ ] Shop coupons and campaigns
- [ ] Shop theme customization
- [ ] Multiple staff accounts and permissions
- [ ] Staff activity log
- [ ] Seller onboarding checklist
- [ ] Seller support tickets

## Cart, checkout & orders

- [ ] Persistent cart across devices
- [ ] Guest cart merge after login
- [ ] Quantity validation against stock
- [ ] Variant selection required before add-to-cart
- [ ] Shipping address book
- [ ] Address validation and delivery notes
- [ ] Delivery fee calculation by region
- [ ] Pickup / standard / express options
- [ ] Delivery ETA estimate
- [ ] Multi-shop checkout clarity
- [ ] Order number and receipt
- [ ] Order status timeline
- [ ] Seller-specific order views
- [ ] Order cancellation rules
- [ ] Return request workflow
- [ ] Refund tracking
- [ ] Exchange workflow
- [ ] Partial fulfilment
- [ ] Shipment tracking number
- [ ] Courier integration adapter
- [ ] Proof of delivery
- [ ] Customer invoice PDF
- [ ] Order history and reorder
- [ ] Abandoned cart reminders
- [ ] Order notes for buyer and seller
- [ ] Fraud/risk review queue
- [ ] Inventory reservation and atomic stock decrement
- [ ] Idempotent order creation
- [ ] Server-side price recalculation
- [ ] Order status transition validation

## Payments & finance

- [ ] Cash on delivery (COD) rules
- [ ] eSewa checkout integration
- [ ] Khalti checkout integration
- [ ] Fonepay / QR payment option
- [ ] Bank transfer instructions
- [ ] Dynamic merchant payment QR per order
- [ ] Payment reference / transaction ID capture
- [ ] Payment proof upload
- [ ] Server-side payment verification
- [ ] Payment webhook signature verification
- [ ] Payment status separate from order status
- [ ] Pending / paid / failed / refunded states
- [ ] Duplicate payment webhook protection
- [ ] Refund initiation and audit trail
- [ ] Seller settlement/payout process
- [ ] Platform commission configuration
- [ ] Tax/VAT invoice fields where applicable
- [ ] Currency and NPR formatting
- [ ] Payment reconciliation report
- [ ] Daily settlement report

## Notifications & communication

- [ ] In-app notification centre
- [ ] Unread count and mark-read
- [ ] Email verification
- [ ] Welcome email
- [ ] Order placed email to buyer
- [ ] New order email to seller
- [ ] Order shipped/delivered email
- [ ] Cancellation/refund email
- [ ] Shop approval/rejection email
- [ ] Low-stock email to seller
- [ ] Payment result email
- [ ] Email preference centre
- [ ] Unsubscribe handling for non-essential emails
- [ ] Retry queue for transient email errors
- [ ] Email delivery/error logs
- [ ] Notification deduplication
- [ ] Push notifications (optional PWA)
- [ ] SMS/WhatsApp provider adapter (optional)
- [ ] Quiet hours and frequency controls
- [ ] Admin broadcast with audience targeting

## Search, discovery & conversion

- [ ] Full-text product search
- [ ] Autocomplete suggestions
- [ ] Search typo tolerance
- [ ] Filters for price/category/brand/size/color
- [ ] Sort by relevance/price/newest/rating
- [ ] Pagination or cursor-based loading
- [ ] Empty-state suggestions
- [ ] Recently searched terms
- [ ] Popular products
- [ ] Featured products
- [ ] Nearby shops filter
- [ ] Shop/product share links
- [ ] Canonical URLs
- [ ] SEO metadata per product/shop
- [ ] Sitemap updates for public products
- [ ] Social preview Open Graph images

## Trust, safety & customer support

- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie/privacy controls where applicable
- [ ] Return/refund policy pages
- [ ] Contact/support page
- [ ] Seller identity and contact visibility controls
- [ ] Report listing/shop/user
- [ ] Review abuse prevention
- [ ] Rate limiting for sensitive APIs
- [ ] Spam and bot protection
- [ ] Admin moderation queue
- [ ] Account deletion request flow
- [ ] Data export request flow
- [ ] Age-appropriate content moderation if needed
- [ ] Security incident contact and procedure

## Admin, analytics & operations

- [ ] Role-based admin permissions
- [ ] Admin audit log
- [ ] Seller approval dashboard
- [ ] Product moderation dashboard
- [ ] Order dispute dashboard
- [ ] Payment reconciliation dashboard
- [ ] Configurable platform settings
- [ ] Feature flags
- [ ] Analytics dashboard with defined metrics
- [ ] Conversion funnel tracking with privacy controls
- [ ] Error monitoring and alerting
- [ ] Uptime/health endpoint
- [ ] Scheduled backups and restore test
- [ ] Data retention policy
- [ ] Database indexes reviewed
- [ ] Pagination on all large lists
- [ ] Background job queue
- [ ] Dead-letter/retry monitoring
- [ ] Load and concurrency testing
- [ ] Staging environment separate from production

## Security, quality & accessibility

- [ ] Firestore rules reviewed against every collection
- [ ] Server-authoritative role checks
- [ ] Least-privilege API credentials
- [ ] No secrets in ZIP or source control
- [ ] Environment variable validation at startup
- [ ] Authentication and authorization tests
- [ ] Input validation on server and client
- [ ] Output escaping / XSS protection
- [ ] CSRF strategy for cookie-auth routes
- [ ] CORS allowlist
- [ ] Secure headers and CSP
- [ ] Upload MIME/size/content validation
- [ ] Signed upload URLs or trusted upload proxy
- [ ] Request body size limits
- [ ] Rate limiting and abuse quotas
- [ ] Dependency vulnerability scan
- [ ] Automated unit tests
- [ ] Integration tests with Firebase emulator
- [ ] End-to-end buyer/seller/admin tests
- [ ] Mobile responsive layouts
- [ ] Keyboard navigation and focus states
- [ ] Accessible labels and contrast
- [ ] Loading/error/retry states
- [ ] Offline/poor-network behavior
- [ ] Browser compatibility testing
- [ ] Production build and smoke test
- [ ] Rollback and release versioning
- [ ] Privacy-safe logging without tokens/PII
