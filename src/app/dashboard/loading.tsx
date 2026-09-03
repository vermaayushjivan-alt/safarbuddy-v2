// P0.1 follow-up (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 1
// and MASTER_PLAN.md Phase 0.1): this segment had no loading.tsx, so
// while dashboard/layout.tsx's server-side getAuthUser() check and the
// page's own data fetch (e.g. getMyBookings()) are in flight, Next.js
// had nothing to show — on a slow connection this can read as a brief
// blank/flash on every navigation into /dashboard, which is part of
// what was reported as "glitchy."
//
// This renders instantly (before any server work resolves) and is
// automatically replaced once the real page is ready — same visual
// language as the existing LoadingScreen used elsewhere, kept simple
// since this is a route-segment loading state, not a full auth gate.
import Image from "next/image";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Image
          src="/brand/logo-mark.svg"
          alt="SafarBuddy"
          width={48}
          height={48}
          className="mx-auto h-12 w-12 animate-pulse"
          priority
        />
        <p className="mt-4 text-[13px] text-ink/60">Loading…</p>
      </div>
    </div>
  );
}

