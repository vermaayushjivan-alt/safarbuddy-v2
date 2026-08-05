"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export default function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const initials = getInitials(displayName, user.email);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-deep font-heading text-[13px] font-semibold text-cream transition hover:opacity-90 active:scale-[0.97]"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName ?? user.email ?? "Profile"}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-deep/10 bg-white/95 py-1.5 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-md"
        >
          <div className="border-b border-deep/10 px-4 py-2.5">
            <p className="truncate font-heading text-[13px] font-semibold text-deep">
              {displayName ?? "My Account"}
            </p>
            {user.email && (
              <p className="truncate text-[12px] text-ink/50">{user.email}</p>
            )}
          </div>
          
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focus-ring block px-4 py-2.5 font-heading text-[14px] font-medium text-ink/75 hover:bg-mist hover:text-deep"
          >
            My Profile
          </a>
          
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focus-ring block px-4 py-2.5 font-heading text-[14px] font-medium text-ink/75 hover:bg-mist hover:text-deep"
          >
            Dashboard
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="focus-ring block w-full px-4 py-2.5 text-left font-heading text-[14px] font-medium text-orange hover:bg-mist"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
