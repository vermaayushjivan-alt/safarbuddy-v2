import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';

// P0.1 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 1):
// This layout previously used the client-side <ProtectedRoute> +
// useAuth()/AuthContext pattern, which independently re-checks the
// session in the browser AFTER middleware.ts has already checked it
// server-side. That double, unsynced auth check is what caused the
// reported "dashboard glitches / flashes repeatedly" bug: AuthContext's
// onAuthStateChange handler calls router.refresh() on SIGNED_IN /
// USER_UPDATED, which re-renders the route and can re-trigger the
// client auth listener, flipping ProtectedRoute's `loading` state
// (and therefore its spinner-vs-content render) more than once right
// after login/navigation.
//
// Every other protected area in the app (admin, hotel-owner, vendor,
// travel-agent, super-admin — see src/app/admin/layout.tsx) already
// uses this same server-side requireRole() pattern with no such issue.
// This brings /dashboard in line with that established, working
// convention instead of being the one area using a different one.
//
// Also fixes a real (if currently latent) bug: the old ProtectedRoute
// checked `user.user_metadata?.role`, a field the app's real
// authorization model (roles / user_roles tables, see
// DATABASE_BIBLE.md) never actually populates — so any role check
// passed through that component could never truthfully pass. This
// layout doesn't currently need a role filter beyond "any
// authenticated user," so requireRole() is called with every AppRole
// that should be able to see "My Bookings."
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole([
      'user',
      'hotel_owner',
      'vendor',
      'travel_agent',
      'admin',
      'super_admin',
    ]);
  } catch (err) {
    // Same error-handling shape as admin/layout.tsx — see that file's
    // comment for why every error must be handled distinctly instead
    // of collapsing everything into redirect('/').
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      redirect('/login?redirectTo=/dashboard');
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      redirect('/unauthorized');
    }
    throw err;
  }

  return <>{children}</>;
}
