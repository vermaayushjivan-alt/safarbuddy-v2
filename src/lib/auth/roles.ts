import "server-only";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { roles, userRoles } from "@/db/schema";

/**
 * VENDOR-03 (M1) — infrastructure for the M2 "List Your Property" flow.
 *
 * This is NOT a Server Action and is NOT exported to any client
 * component. It has no requireRole() call of its own — deliberately,
 * because the whole point is to let a brand-new (currently role-less)
 * user become a hotel_owner/vendor during self-service onboarding,
 * which by definition happens before they'd pass a requireRole()
 * check for that role. Safety instead comes from:
 *
 *   1. SELF_SERVICE_GRANTABLE_ROLES is a hardcoded allowlist. Nothing
 *      in this file accepts an arbitrary role string from a caller —
 *      grantSelfServiceRole()'s `role` param is typed to the literal
 *      union below, not AppRole. It is therefore not possible for a
 *      caller (even a compromised/careless one) to pass "admin" or
 *      "super_admin" and have TypeScript let it through.
 *   2. This module must only ever be called from a Server Action that
 *      has already established which authenticated user it's acting
 *      on behalf of (e.g. via getAuthUser()) — it never trusts a
 *      userId handed to it from client input alone. The M2 action is
 *      responsible for that; documented here so it isn't missed.
 *   3. Idempotent: granting a role the user already has is a no-op,
 *      not an error — onConflictDoNothing on the (user_id, role_id)
 *      primary key (see schema.ts userRoles).
 */
export const SELF_SERVICE_GRANTABLE_ROLES = ["hotel_owner", "vendor"] as const;
export type SelfServiceGrantableRole =
  (typeof SELF_SERVICE_GRANTABLE_ROLES)[number];

/**
 * Grants one of the allowlisted roles to a user. Looks the role up by
 * name (roles.name — seeded lowercase snake_case, see
 * 002_role_seed_auth05.sql) rather than assuming/inventing a role id.
 *
 * Throws if the role row doesn't exist in `roles` yet — this is
 * intentional (RULE 7/8: never invent schema/enums). If
 * 'hotel_owner' or 'vendor' isn't seeded in the live `roles` table,
 * that must be fixed at the data level, not papered over here.
 */
export async function grantSelfServiceRole(
  userId: string,
  role: SelfServiceGrantableRole
): Promise<void> {
  if (!SELF_SERVICE_GRANTABLE_ROLES.includes(role)) {
    // Unreachable given the parameter type, kept as a runtime guard
    // in case this is ever called from a less-strict call site
    // (e.g. after a refactor loosens the type).
    throw new Error(`grantSelfServiceRole: '${role}' is not self-service-grantable`);
  }

  const [roleRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, role))
    .limit(1);

  if (!roleRow) {
    throw new Error(
      `grantSelfServiceRole: role '${role}' not found in roles table — seed it first`
    );
  }

  await db
    .insert(userRoles)
    .values({ userId, roleId: roleRow.id })
    .onConflictDoNothing();
}

/**
 * Returns whether a user already holds a given self-service-grantable
 * role — used by M2 to avoid re-granting / to branch UI copy
 * ("your property is pending review" vs "become a host").
 */
export async function hasSelfServiceRole(
  userId: string,
  role: SelfServiceGrantableRole
): Promise<boolean> {
  const [roleRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, role))
    .limit(1);

  if (!roleRow) return false;

  const [existing] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(
      and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleRow.id))
    )
    .limit(1);

  return Boolean(existing);
}

