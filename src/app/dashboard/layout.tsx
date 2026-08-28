import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';

// P0.1 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 1):
// This layout previously used the client-side <ProtectedRoute> +
// useAuth()/AuthContext pattern, which independently re-checks the
// session in the browser AFTER middleware.ts has already checked it
// server-side. That double, unsynced auth check is what caused the
// reported "dashboard glitches / flashes repeatedly" bug: AuthContext's
// onAuthStateChange handler used to call router.refresh() on SIGNED_IN /
// USER_UPDATED, which re-renders the route and can re-trigger the
// client auth listener, flipping ProtectedRoute's `loading` state
// (and therefore its spinner-vs-content render) more than once right
// after login/navigation.
//
// This moves the check server-side, matching the pattern used by
// admin/hotel-owner/vendor/travel-agent/super-admin layouts — but,
// unlike those, /dashboard is intentionally gated on AUTHENTICATION
// ONLY (getAuthUser()), not requireRole(). "My Bookings" must be
// reachable by literally any signed-in account regardless of which
// application role(s) it has — that was the old ProtectedRoute's real
// behavior too (it only checked `!user`, no allowedRoles were ever
// passed to it here). An earlier version of this fix used
// requireRole([...]) instead, but that regressed real accounts that
// have no row in public.user_roles yet (the on_auth_user_created
// trigger — src/db/sql/001_auth_sync_trigger.sql — is supposed to
// assign the default "user" role on every signup, but this is a known
// unreliable path, e.g. the still-open "Google OAuth
// unexpected_failure" item in SESSION_HANDOFF.md's "Other pending
// work"). Do not reintroduce a requireRole() call here without first
// confirming role-assignment is 100% reliable for every signup path.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login?redirectTo=/dashboard');
  }

  return <>{children}</>;
}
