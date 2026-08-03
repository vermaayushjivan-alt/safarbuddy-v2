/**
 * Route Guards (AUTH-03)
 *
 * WHY IT EXISTS:
 * - Reusable, page-level auth helpers for Server Components / Route
 *   Handlers, so individual protected pages don't repeat the same
 *   "get user, redirect if missing" logic.
 * - Deliberately separate from src/lib/auth/session.ts (AUTH-01) — this
 *   file only *consumes* getAuthUser(), it never redefines or changes it.
 *
 * RESPONSIBILITY:
 * - requireLogin()            -> "Require Login" guard for protected pages
 * - hasActiveSession()        -> "Check Session" boolean helper
 * - redirectIfAuthenticated() -> "Redirect Guest" guard for login/register
 *
 * SERVER/CLIENT: Server only
 *
 * USED BY: src/app/(auth)/layout.tsx, and future protected route pages
 * (/profile, /bookings, /wallet, /support, /settings, etc.)
 */

import "server-only";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";

/**
 * "Require Login" — guarantees a page only renders for an authenticated
 * user. Redirects to /login (preserving the intended destination) if
 * there is no session. Use for pages that need *any* logged-in user,
 * with no role requirement — for role-gated pages, use requireRole()
 * from session.ts instead.
 */
export async function requireLogin(currentPath?: string) {
  const user = await getAuthUser();

  if (!user) {
    const loginUrl = currentPath
      ? `/login?redirectTo=${encodeURIComponent(currentPath)}`
      : "/login";
    redirect(loginUrl);
  }

  return user;
}

/**
 * "Check Session" — lightweight boolean check for when a Server Component
 * only needs to know whether someone is logged in (e.g. to conditionally
 * render UI) without needing the full user object or throwing/redirecting.
 */
export async function hasActiveSession(): Promise<boolean> {
  const user = await getAuthUser();
  return user !== null;
}

/**
 * "Redirect Guest" — the inverse guard, for guest-only routes like
 * /login and /register. If a session already exists, skip the auth form
 * and send the user straight to their default destination.
 */
export async function redirectIfAuthenticated(to: string = "/dashboard") {
  const user = await getAuthUser();

  if (user) {
    redirect(to);
  }
}
