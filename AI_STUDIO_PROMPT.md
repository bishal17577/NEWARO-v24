Build a working mobile-first web app called NEWARO: a social-commerce platform for Nepal. Build it in phases. Run each phase and fix errors before starting the next.

TECH
- React, Vite, TypeScript, Tailwind CSS, Firebase Auth and Firestore, and an Express server for AI.
- All Gemini calls happen on the server. Read the keys from server environment variables named GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2 and GEMINI_API_KEY_3 (set them in the Secrets panel). Never put a key in browser code.
- Spread AI requests evenly across the keys. If a key hits its quota, rest it for 5 minutes and use the next key.
- No bank or card integration. Payment is Cash on Delivery (COD) and NEWARO coins.

REAL DATA ONLY (most important rule)
- Never create sample, demo, placeholder or invented data: no fake users, prices, shops, stories, ratings, revenue, or stock photos.
- Every number and list comes from Firestore or from the user's own actions.
- When there is no data, show an honest empty state with one clear next step, for example "No orders yet. Explore products to place your first order."
- A missing photo shows an empty tile or a neutral icon. Never a stock image.

ROLES (enforce in Firestore Security Rules, not only in the UI)
- Guest: browse Home, Explore, Shops, Events, News.
- Customer (role "user"): guest features plus cart, COD checkout, orders, messages, following shops, notifications, coins, profile.
- Seller (role "shop_owner"): customer features plus create shop, add products, shop dashboard, shop orders.
- Freelancer: customer features plus Jobs and Gigs (send proposals) and the contractor performance hub.
- Admin: only the admin account set on the server. Admin console with overview, users, stores, email broadcast, quests and coins, and admin tools (live counts, CSV exports, shortcuts, user lookup).

DESIGN
- Minimal liquid glass: soft light background with a gentle color glow, frosted translucent panels with backdrop blur, a thin white edge highlight, rounded corners of 20-28 px, one accent color (#2563EB). Font: Plus Jakarta Sans. Include dark mode.
- Mobile: bottom tab bar (Home, Explore, Create, Notifications, Profile). Desktop: left sidebar with the same items plus Shops, Nearby, Events, Jobs and Gigs, My Orders, Messages and Settings.
- Use the reference layouts in this order of importance: Home feed with story row and tabs (For You, Posts, Following, Events, Freelancing); product grid with pill filters; product detail; cart and checkout with Standard and Express delivery; orders with status tabs; messages; profile with Posts, Products, Saved and About tabs; seller dashboard with stat cards and a sales chart; admin console.
- Do not add property or real-estate features. Two of the references are a property app; use only their clean style.

SCREENS (build every one)
1. Home: story row with one ring per person showing the author's avatar. Tapping opens the viewer. Stories expire after 24 hours. A story can be a photo or a video; a story with no media shows its caption. Tabs, product carousel with real discount badges, community posts with like and comment, trending categories, best stores, and a floating NEWARO AI button.
2. Explore: search, category chips, product grid (photo, name, price, Add to cart).
3. Product detail: gallery, price, original price, stock, variants where they exist, description, reviews, Add to cart, Buy now.
4. Cart and checkout: quantity controls, subtotal, Standard or Express delivery, province, district and address form, COD order, coin voucher.
5. Orders: tabs All, Processing, Shipped, Delivered, Cancelled. Order detail with a status timeline.
6. Messages: conversation list, chat view, unread count, text and image messages.
7. Notifications: real items only. Filters All, Unread, Orders, Messages, Jobs, System. Mark read and mark all read.
8. Profile: avatar, followers and following counts, tabs Posts, Products, Saved and About. Quick tools: orders, coin balance, unread alerts, followed shops, posts, my shops, my products, saved items, edit profile, create post, start a shop, membership, settings, and copy profile link.
9. Shops: verified shops, shop page with products, follow button, follower count.
10. Seller dashboard: stat cards and a sales chart from real orders, product and order management.
11. Jobs and Gigs: browse, post a job, send a proposal, my proposals.
12. Contractor performance hub: earnings and proposal numbers from real proposals, goals, and a weekly AI report built only from those numbers. Empty until there is activity.
13. Events: list, create (signed in only), RSVP.
14. Coins and wallet: balance and history from real entries, voucher redemption.
15. News: real announcements from the announcements collection only.
16. Admin console: overview, users, stores, email broadcast, quests and coins, admin tools.
17. Settings: theme (light, dark, system), notification preferences, sign out.

NEWARO AI (server-side Gemini)
- Opens as a bottom sheet from the floating button.
- Answers any question like a general AI assistant, and focuses on NEWARO: products, prices, shops, orders, jobs, events and how to use the app.
- Recommends only products from the real catalog it receives. Never invent an item, price or shop.
- For "best food", "price of X" or "what should I buy": return up to 6 matching real products as a horizontal row of cards. Each card shows photo, name, price in Rs., shop, and Add to cart. The row swipes left and right inside the chat only. The page does not move.
- Keep answers to 2-5 short, plain-text sentences.
- Limit each visitor to 20 messages per minute.
- If the AI is unavailable, show matching real products by keyword instead.

SECURITY
- Firestore rules: users change only their own profile, orders, read state and follows. Sellers change only their own shop and products. Admin is checked by account and role. Validate required fields on create. Never make API keys or private user data public.

BUILD ORDER
Phase 1: auth, roles, responsive layout, security rules.
Phase 2: products, shops, explore, product detail, cart, COD checkout, orders.
Phase 3: stories, posts, follows, notifications, messages.
Phase 4: NEWARO AI with the real catalog and swipe cards.
Phase 5: seller dashboard, admin console, admin tools.
Phase 6: jobs, proposals, contractor hub, events, coins, news.
After each phase, test the main flow, fix errors, then say what works and what is still empty.

ACCEPTANCE TESTS
- Sign in, add a product to cart, place a COD order, see it in Orders.
- Ask NEWARO AI for "best food" and swipe the product cards.
- Add a story: it appears once for its author and disappears after 24 hours.
- Admin sees live counts and downloads a CSV.
- Every empty page shows an empty state, never sample data.
