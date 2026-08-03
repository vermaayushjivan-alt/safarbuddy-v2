/**
 * API Route Guard (AUTH-05)
 *
 * WHY IT EXISTS:
 * - src/lib/auth/session.ts's requireRole() throws on failure, which is
 *   correct for Server Components (paired with redirect() in a try/catch
 *   at the layout level — see src/app/admin/layout.tsx etc.).
 * - Route Handlers (src/app/api/**\/route.ts) don't render UI, so a thrown
 *   error there becomes an unhandled 500 instead of a clean 401/403 JSON
 *   response. This wraps requireRole() with that HTTP-shaped error
 *   handling, without changing requireRole() itself.
 *
 * RESPONSIBILITY:
 * - requireApiRole(allowed) -> { user } on success, or a NextResponse
 *   (401/403) to return immediately from the handler.
 *
 * SERVER/CLIENT: Server only (Node.js runtime route handlers — same
 * constraint as session.ts, since it goes through Drizzle/pg).
 *
 * USAGE (future API-01+ routes):
 *
 *   export async function GET(req: NextRequest) {
 *     const guard = await requireApiRole(["admin", "super_admin"]);
 *     if (guard instanceof NextResponse) return guard;
 *     const { user } = guard;
 *     // ... handler logic, `user` is the authorized CurrentUser
 *   }
 */

import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppRole } from "@/db/schema";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Validates session + role for a Route Handler. Returns the authorized
 * user on success. On failure, returns a NextResponse that the caller
 * should return immediately (`if (guard instanceof NextResponse) return
 * guard;`), keeping every protected API's error shape consistent.
 */
export async function requireApiRole(
  allowed: AppRole[]
): Promise<{ user: CurrentUser } | NextResponse> {
  const current = await getCurrentUser();

  if (!current) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Login required." },
      },
      { status: 401 }
    );
  }

  const hasRole = current.roles.some((role) => allowed.includes(role));
  if (!hasRole) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions." },
      },
      { status: 403 }
    );
  }

  return { user: current };
}

/**
 * Lightweight session-only check for API routes that need any logged-in
 * user, no specific role (mirrors requireLogin() from route-guards.ts,
 * shaped for JSON responses instead of redirects).
 */
export async function requireApiSession(): Promise<
  { user: CurrentUser } | NextResponse
> {
  const current = await getCurrentUser();

  if (!current) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Login required." },
      },
      { status: 401 }
    );
  }

  return { user: current };
}
