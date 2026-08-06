import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",

  // AUTH-06 Public Marketing Pages
  "/hotels",
  "/destinations",
  "/about",
  "/contact",
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
