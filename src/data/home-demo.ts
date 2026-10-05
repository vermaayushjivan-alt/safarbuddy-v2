// ROOT PATH: src/data/home-demo.ts
// HOME-REDESIGN-01 — DEMO CONTENT for the redesigned homepage.
//
// Everything in this file is PLACEHOLDER. It exists so the new layout looks
// full before real ads / coupons / partners are set up. Every demo item
// disappears on its own once real data exists (ads: /admin/promotions), or
// all at once by setting SHOW_HOME_DEMO to false. Do NOT leave this true
// when real campaigns go live. Names/codes below are invented on purpose
// (no real brands).

import type { PromotionSlot } from "@/lib/repositories/promotion.repository";

export const SHOW_HOME_DEMO = true;

export interface DemoAd {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
}

// One sample creative per existing promotion slot.
export const demoAds: Record<PromotionSlot, DemoAd> = {
  after_hero: {
    title: "Weekend Getaway Sale",
    subtitle: "Flat 20% off on partner hotels this weekend",
    cta: "Explore stays",
    href: "/hotels",
    gradient: "from-deep via-deep-2 to-sky",
  },
  between_destinations_trending: {
    title: "Stay 2 nights, save more",
    subtitle: "Sponsored deals from our verified hotel partners",
    cta: "View deals",
    href: "/offers",
    gradient: "from-orange to-orange-2",
  },
  between_packages_testimonials: {
    title: "Planning a family trip?",
    subtitle: "Curated holiday packages with stay included",
    cta: "See packages",
    href: "/packages",
    gradient: "from-deep-2 via-sky to-sky-light",
  },
};

export interface DemoCoupon {
  code: string;
  title: string;
  note: string;
  accent: string;
}

export const demoCoupons: DemoCoupon[] = [
  { code: "SAFAR10", title: "10% off your first stay", note: "On bookings above ₹1,500", accent: "bg-orange" },
  { code: "WEEKEND15", title: "15% off weekend nights", note: "Fri – Sun check-ins", accent: "bg-sky" },
  { code: "LONGSTAY", title: "Extra 5% on 3+ nights", note: "Auto-applies at checkout", accent: "bg-deep" },
];

export interface DemoPartner {
  name: string;
  tagline: string;
  gradient: string;
}

export const demoPartners: DemoPartner[] = [
  { name: "Sunrise Resorts", tagline: "Beach & hill resorts", gradient: "from-orange to-orange-2" },
  { name: "Himalaya Stays", tagline: "Mountain homestays", gradient: "from-deep to-sky" },
  { name: "Royal Heritage", tagline: "Palace & haveli hotels", gradient: "from-deep-2 to-deep" },
  { name: "Lake View Inns", tagline: "Quiet lakeside rooms", gradient: "from-sky to-sky-light" },
];
