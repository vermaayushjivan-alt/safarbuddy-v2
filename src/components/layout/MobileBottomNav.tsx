"use client";

// MOBILE-01/02: app-style bottom tab bar, phones/tablets only (hidden on lg+
// where the desktop Navbar is used). Purely navigation links to existing
// pages — no new data, no new routes, no auth logic (route protection stays
// in middleware.ts / server layouts, RULE 27).
//
// MOBILE-02: centre action button = hotel search (the main thing a
// traveller does); everything else lives in the side menu (MobileDrawer).

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AccountIcon,
  BookingsIcon,
  HomeIcon,
  PackageIcon,
  SearchIcon,
} from "@/components/layout/nav-icons";

// Dashboards/auth screens have their own layouts — no tab bar there.
const HIDDEN_PREFIXES = [
  "/admin",
  "/super-admin",
  "/vendor",
  "/hotel-owner",
  "/travel-agent",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/unauthorized",
  "/api",
];

function isHidden(pathname: string): boolean {
  return (
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.includes("/invoice")
  );
}

interface Tab {
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (isHidden(pathname)) return null;

  // While auth is still loading, show "Account" (no flicker to "Login").
  // Logged-out visitors tapping it simply land on /login via middleware.
  const accountTab: Tab =
    !loading && !user
      ? {
          label: t("tabLogin"),
          href: "/login",
          icon: <AccountIcon />,
          isActive: () => false,
        }
      : {
          label: t("tabAccount"),
          href: "/profile",
          icon: <AccountIcon />,
          isActive: (p) => p === "/profile" || p.startsWith("/referral"),
        };

  const left: Tab[] = [
    { label: t("tabHome"), href: "/", icon: <HomeIcon />, isActive: (p) => p === "/" },
    {
      label: t("tabPackages"),
      href: "/packages",
      icon: <PackageIcon />,
      isActive: (p) => p.startsWith("/packages"),
    },
  ];
  const right: Tab[] = [
    {
      label: t("tabBookings"),
      href: "/dashboard/bookings",
      icon: <BookingsIcon />,
      isActive: (p) => p.startsWith("/dashboard"),
    },
    accountTab,
  ];

  const searchActive = pathname.startsWith("/hotels");

  function renderTab(tab: Tab) {
    const active = tab.isActive(pathname);
    return (
      <li key={tab.href + tab.label}>
        <Link
          href={tab.href}
          aria-current={active ? "page" : undefined}
          className={`relative flex h-14 flex-col items-center justify-center gap-0.5 font-heading text-[11px] font-medium transition active:scale-95 ${
            active ? "text-orange" : "text-ink/55"
          }`}
        >
          {active && (
            <span
              aria-hidden
              className="absolute top-0 h-[3px] w-8 rounded-b-full bg-orange"
            />
          )}
          {tab.icon}
          {tab.label}
        </Link>
      </li>
    );
  }

  return (
    <>
      {/* Spacer so page content never hides behind the fixed bar */}
      <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label={t("tabs")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-deep/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {left.map(renderTab)}

          {/* Centre action: search hotels */}
          <li className="relative">
            <Link
              href="/hotels"
              aria-label={t("tabSearch")}
              aria-current={searchActive ? "page" : undefined}
              className="absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-1/3 place-items-center rounded-full bg-gradient-to-br from-orange to-orange-2 text-white shadow-[0_10px_22px_-6px_rgba(255,106,43,0.75)] ring-4 ring-white transition active:scale-95"
            >
              <SearchIcon className="h-6 w-6" />
            </Link>
            {/* keeps the grid cell the same height as the other tabs */}
            <span className="block h-14" aria-hidden />
          </li>

          {right.map(renderTab)}
        </ul>
      </nav>
    </>
  );
}
