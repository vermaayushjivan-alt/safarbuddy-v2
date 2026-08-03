import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole([
      "admin",
      "super_admin",
      "vendor",
      "hotel_owner",
      "travel_agent",
      "user",
    ]);
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
