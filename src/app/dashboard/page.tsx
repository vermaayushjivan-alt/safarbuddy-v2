import { redirect } from 'next/navigation';

// P1 fix: this segment previously had a layout.tsx but no page.tsx,
// so /dashboard 404'd even though ProfileMenu.tsx links to it directly.
// My Bookings (src/app/dashboard/bookings/page.tsx) is the only
// implemented feature under /dashboard — redirecting here is the
// minimum correct fix rather than inventing a new dashboard-overview
// page that isn't part of any confirmed milestone.

export default function DashboardIndexPage() {
  redirect('/dashboard/bookings');
}
