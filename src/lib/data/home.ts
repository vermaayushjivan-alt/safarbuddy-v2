// Shared homepage data layer.
// Dummy data lives here for now — swap the arrays/fetchers below for
// Supabase queries later without touching the components that consume them.

import {
  Zap,
  Percent,
  Activity,
  Bell,
  Wallet,
  ShieldCheck,
  Plane,
  BedDouble,
  Package as PackageIcon,
  PiggyBank,
  Compass,
  Rocket,
  Ban,
  XCircle,
  Lock,
  MessageCircle,
  Camera,
  AtSign,
  Briefcase,
  PlaySquare,
  Users,
  Headphones,
  BadgeCheck,
  CreditCard,
  Smartphone,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export type BookingType = "Flight" | "Hotel" | "Holiday Package" | "Bus";

export type Testimonial = {
  id: string;
  name: string;
  location: string;
  avatarSeed: string;
  verified: boolean;
  rating: number;
  reviewText: string;
  bookingType: BookingType;
  destination: string;
  travelDate: string;
  helpfulCount: number;
};

export const testimonials: Testimonial[] = [
  {
    id: "goa-trip",
    name: "Priya Sharma",
    location: "Delhi, India",
    avatarSeed: "PS",
    verified: true,
    rating: 5,
    reviewText:
      "Our Goa package was perfectly planned — the beach resort was stunning and the transfers were always on time. SafarBuddy made a 3-day trip feel completely stress-free.",
    bookingType: "Holiday Package",
    destination: "Goa, India",
    travelDate: "Dec 2025",
    helpfulCount: 128,
  },
  {
    id: "dubai-holiday",
    name: "Rahul Mehta",
    location: "Mumbai, India",
    avatarSeed: "RM",
    verified: true,
    rating: 5,
    reviewText:
      "Booked our Dubai flights here and got a much better fare than anywhere else I checked. The booking process took under five minutes and the tickets were confirmed instantly.",
    bookingType: "Flight",
    destination: "Dubai, UAE",
    travelDate: "Jan 2026",
    helpfulCount: 96,
  },
  {
    id: "bali-honeymoon",
    name: "Ananya & Karan",
    location: "Bengaluru, India",
    avatarSeed: "AK",
    verified: true,
    rating: 5,
    reviewText:
      "Our Bali honeymoon package covered everything from the villa to the airport pickup. Every detail felt handpicked — easily the best trip we've taken together.",
    bookingType: "Holiday Package",
    destination: "Bali, Indonesia",
    travelDate: "Feb 2026",
    helpfulCount: 214,
  },
  {
    id: "kashmir-tour",
    name: "Vikram Singh",
    location: "Jaipur, India",
    avatarSeed: "VS",
    verified: true,
    rating: 4,
    reviewText:
      "The Srinagar houseboat stay was gorgeous and exactly like the photos. Only minor hiccup was a late check-in, but the support team sorted it out quickly.",
    bookingType: "Hotel",
    destination: "Srinagar, Kashmir",
    travelDate: "Nov 2025",
    helpfulCount: 74,
  },
  {
    id: "thailand-vacation",
    name: "Sneha Iyer",
    location: "Chennai, India",
    avatarSeed: "SI",
    verified: true,
    rating: 5,
    reviewText:
      "Flight prices for our Phuket trip were unbeatable, and the app kept us updated at every step. Will definitely book through SafarBuddy again for our next vacation.",
    bookingType: "Flight",
    destination: "Phuket, Thailand",
    travelDate: "Mar 2026",
    helpfulCount: 152,
  },
  {
    id: "manali-family-trip",
    name: "The Kapoor Family",
    location: "Lucknow, India",
    avatarSeed: "TK",
    verified: true,
    rating: 5,
    reviewText:
      "Traveled with two kids to Manali and the bus booking was comfortable with clean seats and punctual timing. Great value for a family trip on a budget.",
    bookingType: "Bus",
    destination: "Manali, Himachal Pradesh",
    travelDate: "Oct 2025",
    helpfulCount: 89,
  },
];

export type HomeStat = {
  id: string;
  value: string;
  label: string;
};

export const homeStats: HomeStat[] = [
  { id: "travelers", value: "50,000+", label: "Happy Travelers" },
  { id: "hotel-bookings", value: "10,000+", label: "Hotel Bookings" },
  { id: "destinations", value: "120+", label: "Destinations" },
  { id: "rating", value: "4.9★", label: "Average Rating" },
];

export type AppBenefit = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const appBenefits: AppBenefit[] = [
  { id: "faster-booking", label: "Faster Booking", icon: Zap },
  { id: "app-discounts", label: "Exclusive App Discounts", icon: Percent },
  { id: "live-updates", label: "Live Booking Updates", icon: Activity },
  { id: "notifications", label: "Instant Notifications", icon: Bell },
  { id: "wallet-rewards", label: "Wallet Rewards", icon: Wallet },
  { id: "secure-payments", label: "Secure Payments", icon: ShieldCheck },
];

export type StoreBadge = {
  id: "google-play" | "app-store";
  eyebrow: string;
  label: string;
};

export const storeBadges: StoreBadge[] = [
  { id: "google-play", eyebrow: "GET IT ON", label: "Google Play" },
  { id: "app-store", eyebrow: "Download on the", label: "App Store" },
];

export type AppDownloadContent = {
  heading: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  qrLabel: string;
};

export const appDownloadContent: AppDownloadContent = {
  heading: "Download the SafarBuddy App",
  subtitle:
    "Book Flights, Hotels, Buses, Trains and Holiday Packages anytime, anywhere.",
  primaryCta: "Download App",
  secondaryCta: "Learn More",
  qrLabel: "Scan to download",
};

export type NewsletterFeature = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const newsletterFeatures: NewsletterFeature[] = [
  { id: "flight-deals", label: "Exclusive Flight Deals", icon: Plane },
  { id: "hotel-discounts", label: "Hotel Discounts", icon: BedDouble },
  { id: "package-offers", label: "Holiday Package Offers", icon: PackageIcon },
  { id: "cashback-alerts", label: "Cashback Alerts", icon: PiggyBank },
  { id: "travel-tips", label: "Travel Tips", icon: Compass },
  { id: "early-access", label: "Early Access Promotions", icon: Rocket },
];

export type TrustBadge = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const newsletterTrustBadges: TrustBadge[] = [
  { id: "no-spam", label: "No Spam", icon: Ban },
  { id: "cancel-anytime", label: "Cancel Anytime", icon: XCircle },
  { id: "secure-subscription", label: "Secure Subscription", icon: Lock },
];

export type NewsletterContent = {
  heading: string;
  subtitle: string;
  placeholder: string;
  submitLabel: string;
  loadingLabel: string;
  privacyNotice: string;
  successMessage: string;
  errorMessage: string;
};

export const newsletterContent: NewsletterContent = {
  heading: "Never Miss a Travel Deal",
  subtitle:
    "Subscribe to receive exclusive flight offers, hotel discounts, holiday packages, cashback offers and travel updates.",
  placeholder: "Enter your email address",
  submitLabel: "Subscribe",
  loadingLabel: "Subscribing...",
  privacyNotice:
    "We respect your privacy. Unsubscribe anytime — no spam, ever.",
  successMessage: "You're subscribed! Watch your inbox for exclusive deals.",
  errorMessage: "Please enter a valid email address.",
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
      { label: "Bus", href: "#" },
      { label: "Train", href: "#" },
      { label: "Holiday Packages", href: "#" },
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
      { label: "Cancellation Policy", href: "#" },
      { label: "Refund Policy", href: "#" },
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
      { label: "Partner With Us", href: "#" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms & Conditions", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Disclaimer", href: "#" },
    ],
  },
];

export const footerTrustBadges: TrustBadge[] = [
  { id: "secure-payments", label: "Secure Payments", icon: Lock },
  { id: "trusted-travelers", label: "Trusted by Travelers", icon: Users },
  { id: "support-24x7", label: "24×7 Support", icon: Headphones },
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
  supportEmail: "vermaayushjivan@gmail.com",
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
    "SafarBuddy helps you book flights, hotels, buses and holiday packages at the best prices — all in one place.",
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

// App Links for the footer reuse the same store badges defined for the
// Download App section above — no duplicate data needed.
export { storeBadges as footerAppLinks };
