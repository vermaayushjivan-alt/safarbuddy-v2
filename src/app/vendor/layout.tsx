import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "super_admin", "vendor"]);
  } catch (err) {
    // See src/app/admin/layout.tsx for why this no longer collapses
    // every failure mode into redirect("/").
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      redirect("/login?redirectTo=/vendor");
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      redirect("/unauthorized");
    }
    throw err;
  }

  return <>{children}</>;
}
