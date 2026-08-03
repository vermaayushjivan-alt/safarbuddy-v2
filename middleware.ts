import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    /\.(svg|png|jpg|jpeg|ico|webp)$/.test(pathname)
  );
}

// NOTE: Middleware runs on the Edge runtime, which cannot use the `pg`
// driver (Node.js-only). So middleware only handles the lightweight,
// fetch-based check: "is there a logged-in session at all?". Role-based
// access (admin/vendor/user) is enforced in each protected route group's
// layout.tsx (Server Component, Node.js runtime) via requireRole() from
// src/lib/auth/session.ts — see src/app/admin/layout.tsx,
// src/app/vendor/layout.tsx, src/app/dashboard/layout.tsx.
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Not logged in -> send to login, preserve intended destination.
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
     * Match all request paths except static assets, to keep the middleware
     * fast while still covering every page and API route.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
