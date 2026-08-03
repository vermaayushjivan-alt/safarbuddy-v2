import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["admin", "vendor"]);
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
