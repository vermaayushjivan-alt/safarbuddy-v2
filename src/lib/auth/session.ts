import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, userRoles, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/db/schema";

/**
 * Returns the authenticated Supabase user for the current request, or null.
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the public.users row + role names for a given auth user id.
 * public.users.id === auth.users.id (AUTH RULE), so no join table lookup
 * beyond user_roles is required.
 */
export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return rows.map((row) => row.name as AppRole);
}

/**
 * Full current-user profile (public.users row + roles), or null if
 * unauthenticated. Use this in Server Components that need both auth
 * state and app-level profile data in one call.
 */
export async function getCurrentUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const userRoleNames = await getUserRoles(authUser.id);

  return {
    id: authUser.id,
    email: authUser.email,
    profile: profile ?? null,
    roles: userRoleNames,
  };
}

/**
 * Throws if there's no session, or if the session's roles don't intersect
 * with `allowed`. Intended for use at the top of Server Actions / Route
 * Handlers that need role gating beyond the middleware's route-based rules.
 */
export async function requireRole(allowed: AppRole[]) {
  const current = await getCurrentUser();
  if (!current) {
    throw new Error("UNAUTHENTICATED");
  }
  const hasRole = current.roles.some((role) => allowed.includes(role));
  if (!hasRole) {
    throw new Error("FORBIDDEN");
  }
  return current;
}
