import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getUserRoles } from "@/lib/auth/session";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
];

const ROLE_ROUTE_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/vendor", roles: ["admin", "vendor"] },
  { prefix: "/dashboard", roles: ["admin", "vendor", "user"] },
];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    /\.(svg|png|jpg|jpeg|ico|webp)$/.test(pathname)
  );
}

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

  // Role-based access for protected prefixes.
  const matchedRule = ROLE_ROUTE_PREFIXES.find((rule) =>
    pathname.startsWith(rule.prefix)
  );

  if (matchedRule) {
    const roles = await getUserRoles(user.id);
    const isAllowed = roles.some((role) => matchedRule.roles.includes(role));

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
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
