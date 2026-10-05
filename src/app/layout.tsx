import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RootProvider } from '@/components/providers/RootProvider';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { getSiteUrl, SITE_NAME, ORG_CONTACT } from '@/lib/seo/site';

const inter = Inter({ subsets: ['latin'] });

// SEO_AUDIT.md §3.4 — metadataBase was never set, so any relative URL
// passed to alternates.canonical / openGraph.url in a page-level
// generateMetadata() (added across src/app/hotels, /destinations,
// /packages, homepage in this session) would fail to resolve to an
// absolute URL. This is what makes those canonical/OG tags actually
// work correctly.
// MOBILE-01: viewport-fit=cover lets the page use the full phone screen
// (notch / home-bar safe areas are handled with env(safe-area-inset-*)).
// Zoom is intentionally NOT disabled (accessibility).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b2f5c',
};

export const metadata: Metadata = {
  applicationName: 'SafarBuddy',
  appleWebApp: {
    capable: true,
    title: 'SafarBuddy',
    statusBarStyle: 'default',
  },
  metadataBase: new URL(getSiteUrl()),
  title: 'SafarBuddy - Your Travel Companion',
  description: 'Book hotels, resorts, homestays and holiday packages with SafarBuddy.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// SEO_AUDIT.md §3.3 — site-wide Organization/WebSite JSON-LD, present
// on every page via the root layout. Built only from real, existing
// contact data already shown in the site footer (src/data/home.ts
// footerContact) — no invented founding date, social profiles, or
// legal-entity details (RULE 11).
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: getSiteUrl(),
  email: ORG_CONTACT.email,
  telephone: ORG_CONTACT.phone,
  address: ORG_CONTACT.address,
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: getSiteUrl(),
  potentialAction: {
    '@type': 'SearchAction',
    target: `${getSiteUrl()}/hotels?city={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <RootProvider>
          {children}
          <MobileBottomNav />
        </RootProvider>
      </body>
    </html>
  );
}
