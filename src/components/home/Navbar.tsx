"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "@/components/layout/ProfileMenu";
import MobileDrawer from "@/components/layout/MobileDrawer";
import { useLanguage } from "@/contexts/LanguageContext";

// LAUNCH-03: only pages that actually exist. Flights / Bus / Train / Visa /
// Forex were "#" (dead clicks) — they return when those products ship.
const links: { label: string; href: string }[] = [
  { label: "Hotels", href: "/hotels" },
  { label: "Packages", href: "/packages" },
  { label: "Destinations", href: "/destinations" },
  { label: "Offers", href: "/offers" },
];

export default function Navbar() {
const [open, setOpen] = useState(false);
const { user } = useAuth();
const { t } = useLanguage();

return (
<>
<header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 pt-[env(safe-area-inset-top)] backdrop-blur-md">
<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
<Link
href="/"
className="focus-ring flex items-center gap-2 rounded-md"
>
<Image
        src="/brand/logo-mark.svg"
        alt="SafarBuddy"
        width={36}
        height={36}
        className="h-9 w-9"
        priority
      />

      <span className="font-heading text-lg font-semibold text-deep">
        Safar<span className="text-orange">Buddy</span>
      </span>
    </Link>

    <nav
      aria-label="Primary"
      className="hidden items-center gap-7 lg:flex"
    >
      {links.map((l) => (
        <Link
          key={l.label}
          href={l.href}
          className="focus-ring relative rounded-md py-1 font-heading text-[14px] font-medium text-ink/70 transition after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-orange after:transition-all after:duration-200 hover:text-deep hover:after:w-full"
        >
          {l.label}
        </Link>
      ))}
    </nav>

    <div className="flex items-center gap-3">
      {/* Desktop: List Your Property */}
      <Link
        href="/list-your-property"
        className="focus-ring hidden rounded-full border border-deep/15 px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:bg-deep/5 sm:block"
      >
        List Your Property
      </Link>

      {user ? (
        <ProfileMenu />
      ) : (
        <>
          <Link
            href="/login"
            className="focus-ring hidden rounded-md font-heading text-[14px] font-medium text-deep sm:block"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="focus-ring rounded-full bg-orange px-5 py-2 font-heading text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(255,106,43,0.7)] transition hover:bg-orange-2 active:scale-[0.97]"
          >
            Register
          </Link>
        </>
      )}

      <button
        type="button"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring grid h-9 w-9 place-items-center rounded-full text-deep lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  </div>

</header>

<MobileDrawer open={open} onClose={() => setOpen(false)} />
</>
);
}
