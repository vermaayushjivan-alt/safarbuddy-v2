import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "vendor", "user"]);
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
