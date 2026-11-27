'use client';

// ROOT PATH: src/components/analytics/MetaPixel.tsx
// PILOT-02 — loads the Meta Pixel on PUBLIC pages only.
//   * Off completely unless NEXT_PUBLIC_META_PIXEL_ID is set in Vercel.
//   * Never runs on account, admin, partner, login or payment screens.
//   * PageView on first load and on every client-side navigation.
//   * "Contact" event whenever a visitor taps a WhatsApp (wa.me) link.
//   * "Lead" is fired by the enquiry form itself (HotelInquiryForm).

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { getMetaPixelId, trackMetaEvent } from '@/lib/analytics/meta-pixel';

const PRIVATE_PREFIXES = [
  '/admin',
  '/super-admin',
  '/dashboard',
  '/hotel-owner',
  '/vendor',
  '/travel-agent',
  '/profile',
  '/payment',
  '/delete-account',
  '/auth',
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api',
];

function isPrivatePath(pathname: string | null): boolean {
  if (!pathname) return true;
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function MetaPixel() {
  const pixelId = getMetaPixelId();
  const pathname = usePathname();
  const privatePath = isPrivatePath(pathname);
  const active = Boolean(pixelId) && !privatePath;
  const firstRun = useRef(true);

  // PageView on client-side route changes (the very first PageView is sent by
  // the init snippet itself, so skip the first effect run).
  useEffect(() => {
    if (!active) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.fbq?.('track', 'PageView');
    } catch {
      // ignore
    }
  }, [pathname, active]);

  // WhatsApp taps -> "Contact" event (event delegation: no changes needed on
  // any button, and it also covers the thank-you screen's WhatsApp button).
  useEffect(() => {
    if (!active) return;
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest?.('a[href^="https://wa.me/"]');
      if (link) trackMetaEvent('Contact');
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [active]);

  if (!active || !pixelId) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
      }}
    />
  );
}
