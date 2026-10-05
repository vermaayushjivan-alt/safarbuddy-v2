
<!-- ROOT PATH: HOMEPAGE_BIBLE.md -->

HOMEPAGE_BIBLE.md

Source of truth for the HOME-REDESIGN effort (mobile-first, app-style homepage with ads/sponsors).
Read together with SESSION_HANDOFF.md. Last updated: 2026-10-05.

## 1. Goal
Homepage should feel like a full travel app on phones ("bhara bhara"), not a stretched
desktop site, with proper places for ads, sponsors and partners. Must NOT copy any other
travel app: identity = SafarBuddy "boarding pass / ticket" look (existing `ticket-notch`,
`route-tag` classes in globals.css), deep blue + orange.

## 2. Tokens (already in src/app/globals.css — do not invent new colors)
deep #0b2f5c, deep-2 #123a70, sky #1b5fcf, sky-light #4f8bea, orange #ff6a2b,
orange-2 #ff8c52, cream #fbf9f4, mist #e7eef7, mist-2 #f2f6fb.
Fonts: font-display (headings), font-heading (labels/buttons). Cards: rounded-2xl,
border-deep/10, white. Horizontal rails: snap-x + hidden scrollbar (see Offers.tsx).

## 3. Section order (src/app/page.tsx)
1. Navbar (existing; footer already hidden on phones, bottom tab bar exists)
2. Hero — boarding-pass HotelSearchBar. On phones the 7-tab row is hidden (<sm) and spacing tightened
3. ServicesGrid (phones only, sm:hidden) — Hotels/Packages/Offers/Refer & Earn live; Flights/Bus/Train/Visa/Forex = "Soon" pills
4. PromoBanner slot `after_hero`
5. CouponStrip (DEMO)
6. Offers (REAL, admin) 7. Destinations (REAL, admin)
8. PromoBanner slot `between_destinations_trending`
9. Trending hotels (REAL) 10. Packages (REAL, admin)
11. PartnersStrip (DEMO)
12. PromoBanner slot `between_packages_testimonials`
13. HostBanner (real links: /list-your-property, /referral)
14. Footer, HomeAiChatWidget

## 4. Demo vs real (IMPORTANT)
All demo content lives in `src/data/home-demo.ts`. Master switch `SHOW_HOME_DEMO`.
| Area | Demo source | How it becomes real |
|---|---|---|
| Ads (3 slots) | `demoAds` -> shown by PromoBanner ONLY when a slot has no active promotion, tagged "Sample ad" | Upload creatives in /admin/promotions; real ones replace the sample automatically per slot |
| Coupons strip | `demoCoupons` (codes are NOT valid) | Needs a public read action over `coupons`; until then keep demo or set switch false |
| Partners strip | `demoPartners` (invented names) | Needs a table/admin screen (not built) |
| Offers/Destinations/Trending/Packages | none — already DB-driven | manage in their admin pages |
BEFORE real campaigns / public marketing: set `SHOW_HOME_DEMO = false` (real bookings are live,
a demo coupon code that fails at checkout is a bad experience).

## 5. Ads system rules
- Reuse `promotions` table + `PromoBanner` (impression on first show, click tracked, rel="sponsored").
- No popups (owner decision). Every ad labelled "Ad" (sample: "Sample ad"). Fixed aspect ratio
  so the page never jumps. Empty slot + demo off => renders nothing.
- Creative guidance: ~1200x600 (2:1), same ratio within a slot, JPG/WebP, < 300 KB, CTA inside the image.
- Slots today: after_hero, between_destinations_trending, between_packages_testimonials.

## 6. Roadmap
- Phase 1 (DONE, coded): ServicesGrid, hero mobile tweaks, demo ad fallback, CouponStrip,
  PartnersStrip, HostBanner, page order.
- Phase 2 (TODO): story-style round destination circles + portrait "Where to go" cards;
  quick date chips (Tonight / Weekend / Next week) inside HotelSearchBar (inspect its props first);
  recently viewed hotels (localStorage); polish Offers/Trending cards for phones.
- Phase 3 (TODO, needs SQL): extra slots (hero_top, in_feed, partners) + `format` column on
  `promotions`; "Sponsored" hotel cards inside Trending (paid placement by hotel owners);
  partners table + admin screen. SQL must be written separately and run by owner in Supabase;
  verify columns via information_schema first (RULE 13/35). Update PROMOTION_SLOT_VALUES,
  PromotionForm SLOT_LABELS and any DB CHECK constraint together.

## 7. Rules
Never invent DB columns. No fake ratings/reviews/prices. Honest "Soon" for verticals without a
backend (flights, bus, train, visa, forex). tsc/eslint/build must be run by owner (no node_modules in sandbox).

## 8. Files
New: src/data/home-demo.ts, src/components/home/{ServicesGrid,CouponStrip,PartnersStrip,HostBanner}.tsx
Modified: src/components/home/{PromoBanner,Hero}.tsx, src/app/page.tsx
Earlier same session (ROOM page): src/app/hotels/[slug]/rooms/[roomId]/page.tsx rewritten to match
the hotel page; src/components/public/HotelGallery.tsx got optional `fallbackHref`.
