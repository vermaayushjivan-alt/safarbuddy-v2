import { redirect } from "next/navigation";

// Audit fix: this segment had a layout.tsx (role gate, super_admin only)
// but no page.tsx at all, so visiting /super-admin directly 404'd even
// though redirectToDashboard() (src/lib/auth/redirect.ts) and the
// super-admin layout's own UNAUTHENTICATED branch both send a
// super_admin user here straight after login.
//
// super_admin is already an allowed role on the full /admin panel (see
// src/app/admin/layout.tsx's requireRole(["admin", "super_admin"])), and
// nothing super-admin-specific has been built beyond that — so, matching
// the same minimum-correct-fix reasoning already used for /dashboard and
// /vendor (see those page.tsx files), this redirects to the real admin
// dashboard rather than inventing a separate super-admin-only overview
// that isn't part of any confirmed milestone.
export default function SuperAdminIndexPage() {
  redirect("/admin");
}
