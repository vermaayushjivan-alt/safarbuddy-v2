import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["super_admin"]);
  } catch (err) {
    // See src/app/admin/layout.tsx for why this no longer collapses
    // every failure mode into redirect("/").
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      redirect("/login?redirectTo=/super-admin");
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      redirect("/unauthorized");
    }
    throw err;
  }

  return <>{children}</>;
}
