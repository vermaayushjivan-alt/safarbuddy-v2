import type { NextConfig } from "next";

// GOLIVE-11 — security headers. The CSP is REPORT-ONLY on purpose: it never
// blocks anything, it only logs violations in the browser console. Check the
// console on /, /hotels, /book and the payment page; once clean, rename the
// header to "Content-Security-Policy" to enforce it.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://challenges.cloudflare.com https://*.cashfree.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://picsum.photos https://*.googleusercontent.com",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.cashfree.com https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com https://*.cashfree.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.cashfree.com",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chnybctlzagtdrggjjhg.supabase.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },

  // ROOM/HOTEL IMAGE UPLOAD FIX (400 on POST /admin/.../images):
  // Next.js Server Actions enforce their own request body size cap that
  // is completely separate from application-level validation. The
  // default is 1MB (see
  // https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit).
  // uploadHotelImageAdmin / uploadRoomImageAdmin (src/app/actions/
  // hotel.actions.ts, src/app/actions/room-type.actions.ts) already
  // validate and advertise a 5MB limit to the admin UI
  // (HOTEL_MAX_IMAGE_SIZE_BYTES / ROOM_MAX_IMAGE_SIZE_BYTES), but
  // without this config any upload over ~1MB was rejected by the
  // framework itself before that code ever ran — the app's own file
  // size check never even executes for such a file. This was never
  // configured, so the effective limit silently stayed at 1MB no matter
  // what the admin UI told staff. Set to comfortably cover the app's
  // stated 5MB image limit plus multipart/JSON overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
