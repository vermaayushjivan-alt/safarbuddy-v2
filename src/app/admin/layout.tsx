import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "super_admin"]);
  } catch (err) {
    // requireRole throws "UNAUTHENTICATED" when there is no session and
    // "FORBIDDEN" when the session exists but lacks the required role.
    // The middleware already redirects unauthenticated requests to
    // /login before this layout runs, but we still guard here in case
    // the session expired between the middleware check and this render.
    //
    // Previously this catch block sent EVERY error — including
    // FORBIDDEN and unexpected DB/session errors — to "/", which is
    // why authenticated non-admin users (and any transient failure)
    // were silently bounced to the homepage instead of seeing a login
    // prompt, an "unauthorized" message, or the real error.
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      redirect("/login?redirectTo=/admin");
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      redirect("/unauthorized");
    }
    // Unexpected error (e.g. DB failure) — rethrow so Next.js renders
    // the nearest error.tsx boundary instead of masking it as a
    // redirect to home.
    throw err;
  }

  return <>{children}</>;
}
