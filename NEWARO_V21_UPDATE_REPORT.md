# NEWARO v21 update report

## Changes made in this update

- Expanded default marketplace categories to 20 groups: Fashion & Clothing, Electronics & Computers, Phones & Accessories, Home & Living, Beauty & Personal Care, Flowers & Gifts, Food & Bakery, Groceries & Daily Needs, Health & Wellness, Sports & Outdoors, Toys & Baby Products, Books & Stationery, Jewellery & Watches, Furniture & Decor, Automotive & Tools, Handmade & Handicrafts, Art & Collectibles, Pets & Pet Supplies, Services & Repairs, Freelance & Gigs, and Events & Experiences.
- Fixed the Story Viewer visual layering: reduced the heavy black page overlay, replaced the hard dark story canvas with a neutral theme-aware canvas, adjusted image blur opacity and containment, made the media area flexible, and added a video load error notification.
- Added category-sensitive storefront cover gradients for fashion, electronics, flowers/gifts, food/grocery, beauty, home/furniture, sports, books/art, handicrafts, and automotive/tools. Broken cover images fall back to the generated category theme.
- Updated image-analysis prompt to allow basic face/person presence and visible-person counting while explicitly forbidding identity matching and sensitive trait inference. It does not identify people.
- Set project package version to 21.0.0.

## Validation results

- PASS — `npm run check:syntax`: 75 TypeScript/TSX files scanned, zero syntax diagnostics.
- PASS — `npm run audit:auth-upload`: 15/15 static checks passed.
- BLOCKED — `npm run build`: exit 127; Vite is not installed/available (`vite: not found`).
- BLOCKED — `npm run lint`: exit 2; dependencies/type definitions are not installed (`Cannot find type definition file for 'vite/client'`).
- NOT TESTED — live Firebase, Gemini, ImgBB, browser interaction, and deployment integration. These require dependencies, configured provider credentials, and a running target environment.

## Important API-key security note

A Gemini API key was visible in the user-provided screenshot/message. This package does not hardcode or reuse that key. Treat it as exposed: revoke/rotate it in Google AI Studio/Google Cloud, then put the replacement in server-only `GEMINI_API_KEY` or `GEMINI_API_KEYS` environment variables. Never place provider keys in `VITE_*` variables or commit `.env.local`.

## Deployment status

Not deployed. This is a source update, not a claim that every feature is production-ready. Install project dependencies in the intended environment, configure server-side credentials, run build/lint, then test Firebase rules and the main user flows in a staging deployment before production.
