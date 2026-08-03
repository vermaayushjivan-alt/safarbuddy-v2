import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function TravelAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "super_admin", "travel_agent"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
