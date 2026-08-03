/**
 * Auth Group Layout
 *
 * WHY IT EXISTS:
 * - Applies the "Redirect Guest" rule (AUTH-03) to every route inside the
 *   (auth) group in one place, instead of duplicating the check in
 *   login/page.tsx, register/page.tsx, and forgot-password/page.tsx.
 *
 * RESPONSIBILITY:
 * - If a session already exists, send the user to /dashboard instead of
 *   re-showing the login/register form.
 *
 * SERVER/CLIENT: Server Component
 *
 * USED BY: Next.js for every page under src/app/(auth)/*
 */

import { redirectIfAuthenticated } from "@/lib/auth/route-guards";

export default async function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated();

  return <>{children}</>;
}
