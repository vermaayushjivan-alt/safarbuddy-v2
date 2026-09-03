import { redirect } from "next/navigation";

// VENDOR-BOOKING-01: /vendor previously had a layout.tsx (role gate) but
// no page.tsx at all, so this route was a dead end for a vendor login
// even after VendorLayout let them through. A full vendor dashboard
// home is out of scope here — this just gives the role somewhere real
// to land. Revisit if/when a proper vendor dashboard is scoped.
export default function VendorIndexPage() {
  redirect("/vendor/bookings");
}

