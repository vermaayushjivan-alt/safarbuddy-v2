// ROOT PATH: src/data/home.ts
// Shared data for the footer, mobile drawer and legal/contact pages.
// GOLIVE-13: the unmounted demo content (testimonials, "4.9★ average rating"
// stats, app-download and newsletter blocks) was deleted on purpose so it can
// never be mounted by mistake. Reviews/ratings must come from real bookings.

import {
  Lock,
  MessageCircle,
  Camera,
  AtSign,
  Briefcase,
  PlaySquare,
  BadgeCheck,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type TrustBadge = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type SocialLink = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const footerSocialLinks: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "#", icon: MessageCircle },
  { id: "instagram", label: "Instagram", href: "#", icon: Camera },
  { id: "twitter", label: "X (Twitter)", href: "#", icon: AtSign },
  { id: "linkedin", label: "LinkedIn", href: "#", icon: Briefcase },
  { id: "youtube", label: "YouTube", href: "#", icon: PlaySquare },
];

export type FooterLinkItem = {
  label: string;
  href: string;
};

export type FooterLinkColumn = {
  id: string;
  title: string;
  links: FooterLinkItem[];
};

export const footerLinkColumns: FooterLinkColumn[] = [
  {
    id: "explore",
    title: "Explore",
    links: [
      { label: "Flights", href: "#" },
      { label: "Hotels", href: "/hotels" },
      { label: "Destinations", href: "/destinations" },
      { label: "Offers", href: "/offers" },
      { label: "Bus", href: "#" },
      { label: "Train", href: "#" },
      { label: "Holiday Packages", href: "/packages" },
      { label: "Visa", href: "#" },
      { label: "Forex", href: "#" },
      { label: "Travel Insurance", href: "#" },
    ],
  },
  {
    id: "support",
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "/contact" },
      { label: "Cancellation & Refund Policy", href: "/refund-policy" },
      { label: "Hotel Partner Terms", href: "/partner-terms" },
      { label: "Delete Account", href: "/delete-account" },
      { label: "FAQ", href: "#" },
      { label: "Customer Support", href: "#" },
    ],
  },
  {
    id: "company",
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Press", href: "#" },
      { label: "Affiliate Program", href: "#" },
      { label: "List Your Property", href: "/list-your-property" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Cookie Policy", href: "#" },
      { label: "Disclaimer", href: "#" },
    ],
  },
];

export const footerTrustBadges: TrustBadge[] = [
  { id: "secure-payments", label: "Secure Payments", icon: Lock },
  { id: "verified-partners", label: "Verified Partners", icon: BadgeCheck },
];

export type PaymentMethod = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "visa", label: "Visa", icon: CreditCard },
  { id: "mastercard", label: "Mastercard", icon: CreditCard },
  { id: "rupay", label: "RuPay", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "net-banking", label: "Net Banking", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

export type FooterContact = {
  supportEmail: string;
  supportPhone: string;
  address: string;
  supportHours: string;
};

export const footerContact: FooterContact = {
  supportEmail: "safarbuddytravel@gmail.com",
  supportPhone: "+91 7307493338",
  address:
    "FF Shop No. 6, Arohi Arcade, Munshipulia, Lucknow – 226016, Uttar Pradesh, India",
  supportHours: "Monday – Sunday, 09:00 AM – 09:00 PM IST",
};

export type FooterContent = {
  description: string;
  copyrightText: string;
  popularSearchesLabel: string;
};

export const footerContent: FooterContent = {
  description:
    "SafarBuddy helps you book hotels, resorts, homestays and holiday packages at great prices — all in one place.",
  copyrightText: "© 2026 SafarBuddy. All Rights Reserved.",
  popularSearchesLabel: "Popular Searches",
};

export const popularSearches: FooterLinkItem[] = [
  { label: "Flights to Dubai", href: "#" },
  { label: "Flights to Goa", href: "#" },
  { label: "Hotels in Manali", href: "#" },
  { label: "Hotels in Goa", href: "#" },
  { label: "Goa Packages", href: "#" },
  { label: "Kashmir Packages", href: "#" },
  { label: "Thailand Packages", href: "#" },
  { label: "Bali Honeymoon", href: "#" },
];
