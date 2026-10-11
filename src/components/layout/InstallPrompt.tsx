"use client";

// PWA install popup. Shows a small "Install app" card to visitors who can
// install the site to their home screen.
//  - Android / desktop Chrome & Edge: uses the browser's install prompt, so
//    one tap on "Install" is enough.
//  - iPhone / iPad (Safari): iOS has no install API, so we show the
//    "Share -> Add to Home Screen" steps instead.
// It never shows when the app is already installed, never on checkout /
// dashboard / auth pages, and after "Not now" it stays away for 7 days.
// The app name comes from SITE_NAME, so a future rename needs no change here.

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/seo/site";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed-at";
const INSTALLED_KEY = "install-prompt-installed";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 6000; // let the page load first

// Pages where a popup would get in the way.
const HIDDEN_PREFIXES = [
  "/admin",
  "/super-admin",
  "/vendor",
  "/hotel-owner",
  "/travel-agent",
  "/dashboard",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/unauthorized",
  "/payment",
  "/book",
  "/api",
];

function isHiddenPath(pathname: string): boolean {
  return (
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.includes("/invoice")
  );
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode etc. - ignore */
  }
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [blocked, setBlocked] = useState(true); // installed / dismissed recently
  const [ready, setReady] = useState(false); // delay finished
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsIos(ios);

    const dismissedAt = Number(readStorage(DISMISSED_KEY) ?? 0);
    const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < COOLDOWN_MS;
    setBlocked(standalone || readStorage(INSTALLED_KEY) === "1" || recentlyDismissed);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop the browser's own mini-bar, we show ours
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      writeStorage(INSTALLED_KEY, "1");
      setInstallEvt(null);
      setVisible(false);
      setBlocked(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const canShow = !blocked && ready && !isHiddenPath(pathname) && (!!installEvt || isIos);

  useEffect(() => {
    setVisible(canShow);
  }, [canShow]);

  const dismiss = useCallback(() => {
    writeStorage(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
    setBlocked(true);
  }, []);

  const install = useCallback(async () => {
    if (!installEvt) return;
    try {
      await installEvt.prompt();
      const choice = await installEvt.userChoice;
      if (choice.outcome === "accepted") {
        writeStorage(INSTALLED_KEY, "1");
      } else {
        writeStorage(DISMISSED_KEY, String(Date.now()));
      }
    } catch {
      /* prompt unavailable - ignore */
    }
    setInstallEvt(null);
    setVisible(false);
    setBlocked(true);
  }, [installEvt]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={`Install ${SITE_NAME} app`}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[55] rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(11,47,92,0.18)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px]"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192-2.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--color-ink)]">
            Install {SITE_NAME} app
          </p>
          {installEvt ? (
            <p className="mt-0.5 text-sm text-[var(--color-ink)]/70">
              Faster booking and one-tap access from your home screen.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-[var(--color-ink)]/70">
              Tap the <span className="font-semibold">Share</span> button, then choose{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[var(--color-ink)]/50 hover:bg-black/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink)]/70 hover:bg-black/5"
        >
          Not now
        </button>
        {installEvt ? (
          <button
            type="button"
            onClick={install}
            className="rounded-full bg-[var(--color-orange)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-orange-2)]"
          >
            Install
          </button>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-[var(--color-deep)] px-5 py-2 text-sm font-semibold text-white"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
