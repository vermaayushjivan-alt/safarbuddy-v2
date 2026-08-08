import Link from "next/link";
import {
  Building2,
  Package,
  MapPin,
  Tag,
  Store,
  CalendarCheck,
} from "lucide-react";

const sections = [
  {
    href: "/admin/hotels",
    label: "Hotel Management",
    description: "Create, edit, and manage hotel listings. Images are managed per-hotel from the edit page.",
    icon: Building2,
  },
  {
    href: "/admin/packages",
    label: "Package Management",
    description: "Create, edit, and manage holiday packages.",
    icon: Package,
  },
  {
    href: "/admin/destinations",
    label: "Destination Management",
    description: "Manage destination listings and content.",
    icon: MapPin,
  },
  {
    href: "/admin/offers",
    label: "Offers",
    description: "Manage promotional offers.",
    icon: Tag,
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    description: "Manage vendor accounts and approvals.",
    icon: Store,
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    description: "View, confirm, cancel, and complete hotel and package bookings.",
    icon: CalendarCheck,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep">Admin Dashboard</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          Manage hotels, packages, destinations, offers, and vendors.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="focus-ring group rounded-2xl border border-deep/15 bg-white p-6 transition hover:border-deep/30 hover:shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-mist text-deep">
              <section.icon size={20} aria-hidden />
            </div>
            <h2 className="mt-4 font-heading text-[15px] font-semibold text-deep">
              {section.label}
            </h2>
            <p className="mt-1 text-[13px] text-ink/55">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
