import { redirect } from 'next/navigation';

export function redirectToLogin(returnUrl?: string) {
  const url = returnUrl
    ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/login';
  
  redirect(url);
}

export function redirectToUnauthorized() {
  redirect('/unauthorized');
}

export function redirectToDashboard(role?: string) {
  if (!role) {
    redirect('/dashboard');
    return;
  }

  const roleRoutes: Record<string, string> = {
    super_admin: '/admin/super',
    admin: '/admin',
    hotel_owner: '/dashboard/hotel-owner',
    travel_agent: '/dashboard/travel-agent',
    customer: '/dashboard',
    vendor: '/dashboard/vendor',
  };

  const route = roleRoutes[role] || '/dashboard';
  redirect(route);
}

export function redirectToHome() {
  redirect('/');
}
