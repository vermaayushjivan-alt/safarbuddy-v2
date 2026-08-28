import "server-only";

import { eq } from "drizzle-orm";
import { db, DatabaseConfigError } from "@/db";
import { roles, userRoles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/db/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 * P0.2 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 9):
 * resolves the real public.users.id (Drizzle PK) for a signed-in
 * Supabase Auth user, via the live `auth_user_id` column.
 *
 * IMPORTANT — this directly contradicts the header comment in
 * src/db/schema.ts ("public.users.id === auth.users.id ... No
 * auth_user_id column is ever created"). That comment is confirmed
 * STALE against the live database: this exact lookup pattern
 * (originally written only in src/app/actions/booking.actions.ts as a
 * private, unexported getPublicUserId()) is what made booking creation
 * and "My Bookings" work correctly, while every OTHER piece of code in
 * the app that instead assumed `users.id === authUser.id` directly
 * (src/app/actions/profile.actions.ts, src/lib/actions/payment.actions.ts,
 * and this file's own getUserRoles()/getCurrentUser()) has been
 * confirmed broken for real (non-seeded) accounts — see
 * ULTRA_PRO_AUDIT.md Section 9 for the full evidence trail. Update
 * schema.ts's header comment and the Drizzle `users` table definition
 * to declare `auth_user_id` once this is verified against the live
 * schema — do not delete this helper or revert to the old assumption
 * without that verification.
 *
 * This intentionally takes an already-created Supabase client (rather
 * than creating its own) so callers that already have one (most
 * Server Actions) don't pay for a second one.
 */
export async function resolvePublicUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[resolvePublicUserId] lookup failed", error);
    throw new Error("Unable to load your user profile.");
  }

  if (!data?.id) {
    throw new Error("USER_PROFILE_NOT_FOUND");
  }

  return data.id as string;
}

/**
 * Canonical AppRole values the application code actually checks against
 * (see AppRole in src/db/schema.ts). Kept as a runtime list here so
 * normalizeRoleName() below can validate against it.
 */
const KNOWN_APP_ROLES: readonly AppRole[] = [
  "admin",
  "vendor",
  "user",
  "hotel_owner",
  "travel_agent",
  "super_admin",
];

/**
 * ONE normalization layer for turning a raw `roles.name` DB value into
 * an AppRole (Development Bible Rule 9 — no scattered string conversions).
 *
 * The seeded data (001_auth_sync_trigger.sql, 002_role_seed_auth05.sql)
 * uses lowercase snake_case names ("admin", "super_admin", ...), which is
 * what requireRole() calls throughout the app expect. If `roles.name`
 * ever contains a differently-cased/spaced display value (e.g.
 * "Super Admin"), this still resolves it to the correct AppRole instead
 * of silently failing every requireRole() check.
 *
 * Returns null for any role name with no known AppRole equivalent
 * (e.g. a role added directly in the DB that the app doesn't model yet)
 * rather than guessing/inventing a new AppRole — see Rule 8.
 */
function normalizeRoleName(rawName: string): AppRole | null {
  const key = rawName.trim().toLowerCase().replace(/[\s-]+/g, "_");

  // Explicit aliases where the display name doesn't case-fold onto the
  // matching AppRole directly.
  const ALIASES: Record<string, AppRole> = {
    customer: "user",
  };

  const candidate = ALIASES[key] ?? (key as AppRole);

  return (KNOWN_APP_ROLES as readonly string[]).includes(candidate)
    ? candidate
    : null;
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
  try {
    const rows = await db
      .select({
        name: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return rows
      .map((row) => normalizeRoleName(row.name))
      .filter((role): role is AppRole => role !== null);
  } catch (error) {
    // A missing DATABASE_URL (DatabaseConfigError) or any other Drizzle/DB
    // failure here must not crash the app with an opaque error, and must
    // not be treated as "no roles" (which would silently deny access in a
    // way that's hard to diagnose) — it's surfaced as a distinct,
    // catchable failure so requireRole() can report it safely instead of
    // bypassing the role check.
    if (error instanceof DatabaseConfigError) {
      console.error("[getUserRoles] database is not configured:", error.message);
    } else {
      console.error("[getUserRoles] failed to load roles:", error);
    }
    throw new Error("SERVICE_UNAVAILABLE");
  }
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
