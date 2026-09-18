'use server';

// Nav discoverability fix (2026-09-19). Root cause: /hotel-owner (and
// /admin, /vendor) have always been reachable only by typing the URL —
// ProfileMenu.tsx (the avatar dropdown shown on every page) hardcodes
// just "My Profile" / "Dashboard" / "My Bookings" / "Logout" with no
// role-aware links, so a real hotel_owner had no in-app way to find
// their own property page at all. ProfileMenu is a client component
// rendered from many separate server pages (Navbar.tsx), so instead of
// threading roles as a prop through every one of those pages, this is a
// small dedicated Server Action ProfileMenu can call for itself on
// mount. Returns only the three booleans the nav needs — never the raw
// role list or user id — so this can't become a general-purpose "who
// am I" endpoint.
//
// Returns all-false (not an error) for a signed-out caller, matching
// ProfileMenu's own "if (!user) return null" pattern — the nav simply
// shows no role-specific links rather than surfacing an auth error for
// what is, from the nav's point of view, an entirely normal state.

import { getCurrentUser } from '@/lib/auth/session';

export interface MyNavAccess {
  isHotelOwner: boolean;
  isAdmin: boolean;
  isVendor: boolean;
}

export async function getMyNavAccess(): Promise<MyNavAccess> {
  const current = await getCurrentUser();

  if (!current) {
    return { isHotelOwner: false, isAdmin: false, isVendor: false };
  }

  return {
    isHotelOwner: current.roles.includes('hotel_owner'),
    isAdmin:
      current.roles.includes('admin') || current.roles.includes('super_admin'),
    isVendor: current.roles.includes('vendor'),
  };
}
