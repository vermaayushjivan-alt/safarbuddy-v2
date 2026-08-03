import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["super_admin"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
