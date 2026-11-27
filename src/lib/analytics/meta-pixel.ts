// ROOT PATH: src/lib/analytics/meta-pixel.ts
// PILOT-02 — tiny, safe wrapper around the Meta (Facebook) Pixel.
// Does nothing unless NEXT_PUBLIC_META_PIXEL_ID is set and the pixel script
// has actually loaded, so it can never break a page or a form.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Pixel ID from env. Digits only (validated) — it is placed into a script. */
export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id && /^\d{8,20}$/.test(id) ? id : null;
}

/** Fire a standard Meta event (Lead, Contact, ...). Safe to call anywhere on the client. */
export function trackMetaEvent(
  event: 'Lead' | 'Contact' | 'InitiateCheckout' | 'ViewContent',
  params?: Record<string, string | number>
): void {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    if (params) window.fbq('track', event, params);
    else window.fbq('track', event);
  } catch {
    // Tracking must never affect the visitor.
  }
}
