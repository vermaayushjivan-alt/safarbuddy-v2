import { redirect } from "next/navigation";

export function redirectToLogin(returnUrl?: string) {
  const url = returnUrl
    ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : "/login";

  redirect(url);
}

export function redirectToUnauthorized() {
  redirect("/unauthorized");
}

export function redirectToDashboard(role?: string) {
  if (!role) {
    redirect("/dashboard");
    return;
  }

  const roleRoutes: Record<string, string> = {
    super_admin: "/super-admin",
    admin: "/admin",
    hotel_owner: "/hotel-owner",
    travel_agent: "/travel-agent",
    customer: "/dashboard",
    user: "/dashboard",
    vendor: "/vendor",
  };

  const route = roleRoutes[role] || "/dashboard";
  redirect(route);
}

export function redirectToHome() {
  redirect("/");
}
