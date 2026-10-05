"use client";

// MOBILE-01: app-style bottom tab bar, phones/tablets only (hidden on lg+
// where the desktop Navbar is used). Purely navigation links to existing
// pages — no new data, no new routes, no auth logic (route protection stays
// in middleware.ts / server layouts, RULE 27).

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

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

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const icons = {
  home: (
    <Icon>
      <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" />
    </Icon>
  ),
  hotels: (
    <Icon>
      <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h8A1.5 1.5 0 0 1 16 4.5V21M16 9h2.5a1.5 1.5 0 0 1 1.5 1.5V21M3 21h18M8.5 7.5h4M8.5 11h4M8.5 14.5h4" />
    </Icon>
  ),
  packages: (
    <Icon>
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M4.5 7h15A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7ZM3 12.5h18" />
    </Icon>
  ),
  bookings: (
    <Icon>
      <path d="M7 3v3M17 3v3M4.5 5.5h15A1.5 1.5 0 0 1 21 7v12.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5V7a1.5 1.5 0 0 1 1.5-1.5ZM3 10h18M8 14.5l2.5 2.5L16 12" />
    </Icon>
  ),
  account: (
    <Icon>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Icon>
  ),
};

interface Tab {
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (isHidden(pathname)) return null;

  // While auth is still loading, show "Account" (no flicker to "Login").
  // Logged-out visitors tapping it simply land on /login via middleware.
  const accountTab: Tab =
    !loading && !user
      ? {
          label: "Login",
          href: "/login",
          icon: icons.account,
          isActive: () => false,
        }
      : {
          label: "Account",
          href: "/profile",
          icon: icons.account,
          isActive: (p) => p === "/profile" || p.startsWith("/referral"),
        };

  const tabs: Tab[] = [
    { label: "Home", href: "/", icon: icons.home, isActive: (p) => p === "/" },
    {
      label: "Hotels",
      href: "/hotels",
      icon: icons.hotels,
      isActive: (p) => p.startsWith("/hotels"),
    },
    {
      label: "Packages",
      href: "/packages",
      icon: icons.packages,
      isActive: (p) => p.startsWith("/packages"),
    },
    {
      label: "Bookings",
      href: "/dashboard/bookings",
      icon: icons.bookings,
      isActive: (p) => p.startsWith("/dashboard"),
    },
    accountTab,
  ];

  return (
    <>
      {/* Spacer so page content/footer never hides behind the fixed bar */}
      <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label="Mobile tabs"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-deep/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = tab.isActive(pathname);
            return (
              <li key={tab.label}>
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
          })}
        </ul>
      </nav>
    </>
  );
}

