import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/unauthorized",

  // MOBILE-01: PWA manifest must be readable without a session,
  // otherwise logged-out visitors get redirected to /login for it.
  "/manifest.webmanifest",

  // SEO: crawlers have no session.
  "/robots.txt",
  "/sitemap.xml",

  // AUTH-06 Public Marketing Pages
  "/hotels",
  "/destinations",
  "/packages",
  "/offers",
  "/about",
  "/contact",

  // Host-signup funnel: visitors must see the form before having an account.
  "/list-your-property",

  // LAUNCH-01: public legal pages
  "/privacy",
  "/terms",
  "/refund-policy",
  // PARTNER-TERMS-01: public so owners can read it before signing up
  "/partner-terms",
  // GOLIVE-12: public page explaining how to delete an account
  "/delete-account",

  // GOLIVE-03: uptime monitors have no session
  "/api/health",
];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/hotels/") ||
    pathname.startsWith("/destinations/") ||
    pathname.startsWith("/offers/") ||
    // GOLIVE-06: the /book pages check the session themselves and redirect
    // to /login with the room/dates query preserved.
    pathname.startsWith("/packages/") ||
    pathname.startsWith("/_next") ||
    // Cashfree webhook, cron and other server-to-server endpoints.
    pathname.startsWith("/api/public") ||
    /\.(svg|png|jpg|jpeg|ico|webp)$/.test(pathname)
  );
}

// Authentication is checked here. Role authorization is handled inside the
// protected layouts (admin, vendor, dashboard, hotel-owner, travel-agent,
// super-admin) using server-side helpers.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip the Supabase session lookup for public pages.
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
