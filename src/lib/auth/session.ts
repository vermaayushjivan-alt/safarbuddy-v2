import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, userRoles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/db/schema";

/**
 * Returns the authenticated Supabase user for the current request,
 * or null when no authenticated session exists.
 *
 * Safe for Server Components, Server Actions, and Route Handlers.
 */
export async function getAuthUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Returns application roles assigned to the authenticated user.
 *
 * IMPORTANT:
 * roles/user_roles are the authorization source.
 * We do not query public.users here because role checks
 * do not require the user profile row.
 */
export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const rows = await db
    .select({
      name: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return rows.map((row) => row.name as AppRole);
}

/**
 * Returns the authenticated user plus application roles.
 *
 * The Supabase Auth user is the identity source.
 * The role tables are the authorization source.
 *
 * We intentionally do NOT query public.users here because
 * the live public.users schema does not contain the profile
 * columns used by the stale implementation.
 */
export async function getCurrentUser() {
  const authUser = await getAuthUser();

  if (!authUser) {
    return null;
  }

  const userRoleNames = await getUserRoles(authUser.id);

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    roles: userRoleNames,
    authUser,
  };
}

/**
 * Requires an authenticated user and at least one
 * of the supplied application roles.
 *
 * Throws:
 * - UNAUTHENTICATED when no valid Supabase session exists.
 * - FORBIDDEN when the authenticated user lacks the required role.
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
