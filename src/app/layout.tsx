/**
 * Root Layout
 * 
 * WHY IT EXISTS:
 * - Provides the HTML structure for all pages
 * - Loads global styles and fonts
 * - Wraps app with providers
 * 
 * RESPONSIBILITY:
 * - Define HTML structure
 * - Load fonts
 * - Apply global metadata
 * - Wrap with providers
 * 
 * SERVER/CLIENT: Server Component
 * 
 * USED BY: All pages (this is the root layout)
 */

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import { APP } from '@/lib/config/constants';
import './globals.css';

/**
 * Inter font configuration
 * Loaded from Google Fonts with variable font support
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Default metadata for the application
 * Can be overridden by individual pages
 */
export const metadata: Metadata = {
  title: {
    default: `${APP.NAME} - ${APP.TAGLINE}`,
    template: `%s | ${APP.NAME}`,
  },
  description: APP.DESCRIPTION,
  keywords: [
    'travel',
    'flights',
    'hotels',
    'holiday packages',
    'vacation',
    'booking',
    'India travel',
  ],
  authors: [{ name: APP.COMPANY }],
  creator: APP.COMPANY,
  publisher: APP.COMPANY,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: APP.NAME,
    title: `${APP.NAME} - ${APP.TAGLINE}`,
    description: APP.DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP.NAME} - ${APP.TAGLINE}`,
    description: APP.DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/**
 * Viewport configuration
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E85D24' },
    { media: '(prefers-color-scheme: dark)', color: '#F07A4A' },
  ],
};

/**
 * Root Layout Component
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-primary))] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
