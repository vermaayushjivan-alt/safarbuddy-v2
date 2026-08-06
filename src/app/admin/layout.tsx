import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "super_admin"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
