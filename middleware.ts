import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",

  // MOBILE-01: PWA manifest must be readable without a session,
  // otherwise logged-out visitors get redirected to /login for it.
  "/manifest.webmanifest",

  // AUTH-06 Public Marketing Pages
  "/hotels",
  "/destinations",
  "/packages",
  "/offers",
  "/about",
  "/contact",

  // P0.2 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 2a):
  // This page contains PropertyListingForm, which creates a brand-new
  // account for people who don't have one yet (a "become a host"
  // signup flow). It was missing from PUBLIC_ROUTES, so unauthenticated
  // visitors were bounced to /login before they could even see the
  // form -- breaking the host-signup funnel entirely.
  "/list-your-property",

  // LAUNCH-01: public legal pages
  "/privacy",
  "/terms",
  "/refund-policy",
  // PARTNER-TERMS-01: public so owners can read it before signing up
  "/partner-terms",

  // GOLIVE-03: uptime monitors have no session
  "/api/health",

];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    // Public listing pages have their own dynamic detail routes
    // (e.g. /hotels/[slug], /destinations/[slug]) which are also
    // unauthenticated. An exact-match-only check here sent those to
    // /login even though the pages themselves require no session.
    pathname.startsWith("/hotels/") ||
    pathname.startsWith("/destinations/") ||
    // LAUNCH-03: /offers/[id] detail pages are public too.
    pathname.startsWith("/offers/") ||
    // /packages/[id] detail pages are browsable without an account.
    // GOLIVE-06: the /book pages under /hotels/ and /packages/ check the
    // session themselves and redirect to /login WITH the room/dates query
    // preserved (middleware could only pass the bare path). The old public
    // /booking-confirmation/ prefix was removed with guest checkout.
    pathname.startsWith("/packages/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    /\.(svg|png|jpg|jpeg|ico|webp)$/.test(pathname)
  );
}

// NOTE:
// Middleware runs on the Edge Runtime.
// Keep it lightweight.
// Authentication is checked here.
// Role authorization is handled inside protected layouts
// (admin, vendor, dashboard, hotel-owner, travel-agent, super-admin)
// using server-side helpers.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // AUTH-06 Optimization:
  // Skip Supabase session lookup for public pages.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Session check for protected routes.
  const { supabaseResponse, user } = await updateSession(request);

  // Redirect unauthenticated users to login.
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User authenticated.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
