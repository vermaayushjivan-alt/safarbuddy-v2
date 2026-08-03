import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function HotelOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "super_admin", "hotel_owner"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
