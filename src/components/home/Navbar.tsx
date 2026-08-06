"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "@/components/layout/ProfileMenu";

const links: { label: string; href: string }[] = [
  { label: "Flights", href: "#" },
  { label: "Hotels", href: "/hotels" },
  { label: "Bus", href: "#" },
  { label: "Train", href: "#" },
  { label: "Holiday", href: "#" },
  { label: "Visa", href: "#" },
  { label: "Forex", href: "#" },
  { label: "Offers", href: "#" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-md">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-deep font-heading text-sm font-semibold text-cream">
            SB
          </span>
          <span className="font-heading text-lg font-semibold text-deep">
            Safar<span className="text-orange">Buddy</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="focus-ring relative rounded-md py-1 font-heading text-[14px] font-medium text-ink/70 transition after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-orange after:transition-all after:duration-200 hover:text-deep hover:after:w-full">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <ProfileMenu />
          ) : (
            <>
              <Link href="/login" className="focus-ring hidden rounded-md font-heading text-[14px] font-medium text-deep sm:block">
                Login
              </Link>
              <Link href="/register" className="focus-ring rounded-full bg-orange px-5 py-2 font-heading text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(255,106,43,0.7)] transition hover:bg-orange-2 active:scale-[0.97]">
                Register
              </Link>
            </>
          )}
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)} className="focus-ring grid h-9 w-9 place-items-center rounded-full text-deep lg:hidden">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <nav id="mobile-nav" aria-label="Mobile" className={`grid overflow-hidden border-t border-deep/10 bg-white/95 backdrop-blur-md transition-[grid-template-rows] duration-300 lg:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0">
          <ul className="flex flex-col gap-1 px-6 py-3">
            {links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} onClick={() => setOpen(false)} className="focus-ring block rounded-md px-2 py-2.5 font-heading text-[15px] font-medium text-ink/75 hover:bg-mist hover:text-deep">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-deep/10 pt-3 sm:hidden">
              {user ? (
                <div className="px-2 py-1">
                  <ProfileMenu />
                </div>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="focus-ring block rounded-md px-2 py-2.5 font-heading text-[15px] font-medium text-deep">
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
