"use client";

// MOBILE-02: app-style slide-in side menu (phones/tablets only, lg:hidden).
// Replaces the old dropdown list in Navbar on small screens and takes over
// the job of the website footer on mobile: account links, settings
// (language, install app, share), help & support and legal pages.
//
// Navigation + a language preference only — no new data, routes or auth
// logic. Role-aware links reuse getMyNavAccess() exactly like ProfileMenu
// (server-side authorization stays in the target layouts, RULE 27).

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/messages";
import { getMyNavAccess, type MyNavAccess } from "@/app/actions/my-nav-access.actions";
import { getInitials } from "@/components/layout/ProfileMenu";
import { footerContact, footerContent } from "@/data/home";
import {
  AccountIcon,
  BookingsIcon,
  ChevronRightIcon,
  CloseIcon,
  CompassIcon,
  DashboardIcon,
  DocIcon,
  DownloadIcon,
  GiftIcon,
  GlobeIcon,
  HeadsetIcon,
  HotelIcon,
  InfoIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  PackageIcon,
  PhoneIcon,
  PlusCircleIcon,
  ReceiptIcon,
  ShareIcon,
  ShieldIcon,
  StoreIcon,
  TagIcon,
} from "@/components/layout/nav-icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const rowBase =
  "flex w-full items-center gap-4 px-5 py-3.5 text-left transition active:bg-white/10";
const iconCls = "h-5 w-5 shrink-0 text-orange-2";
const labelCls = "flex-1 font-heading text-[15px] font-medium text-white";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 pb-1 pt-6 font-heading text-[11px] font-semibold uppercase tracking-wider text-white/40">
      {children}
    </p>
  );
}

function LinkRow({
  href,
  icon,
  label,
  onNavigate,
  plain,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onNavigate: () => void;
  /** true for tel:/mailto: links (plain <a>, not client navigation) */
  plain?: boolean;
}) {
  const content = (
    <>
      {icon}
      <span className={labelCls}>{label}</span>
      <ChevronRightIcon className="h-4 w-4 text-white/35" />
    </>
  );
  if (plain) {
    return (
      <a href={href} onClick={onNavigate} className={rowBase}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onNavigate} className={rowBase}>
      {content}
    </Link>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={rowBase}>
      {icon}
      <span className={`${labelCls} ${danger ? "!text-orange-2" : ""}`}>{label}</span>
    </button>
  );
}

export default function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [navAccess, setNavAccess] = useState<MyNavAccess | null>(null);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const accessFetchedFor = useRef<string | null>(null);

  // Close whenever the route changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock page scroll, handle Escape, move/restore focus while open.
  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      lastFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Role-aware links: fetched lazily the first time the menu is opened.
  useEffect(() => {
    if (!user) {
      setNavAccess(null);
      accessFetchedFor.current = null;
      return;
    }
    if (!open || accessFetchedFor.current === user.id) return;
    accessFetchedFor.current = user.id;
    let active = true;
    getMyNavAccess()
      .then((a) => active && setNavAccess(a))
      .catch(() => active && setNavAccess(null)); // non-fatal, same as ProfileMenu
    return () => {
      active = false;
    };
  }, [open, user]);

  // Install-app + share capabilities (client only).
  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
    setCanShare(typeof navigator.share === "function");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installEvt) {
      try {
        await installEvt.prompt();
        await installEvt.userChoice;
      } catch {
        /* user dismissed / unsupported */
      }
      setInstallEvt(null);
      return;
    }
    setShowIosHint((v) => !v);
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: "SafarBuddy",
        text: t("shareText"),
        url: window.location.origin,
      });
    } catch {
      /* user cancelled */
    }
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    null;

  const showInstall = !isStandalone && (!!installEvt || isIos);

  return (
    <div
      className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 bg-ink/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (dx < -70) onClose(); // swipe left to close
        }}
        className={`absolute inset-y-0 left-0 flex w-[86%] max-w-[22rem] flex-col bg-deep text-cream shadow-2xl transition-[transform,visibility] duration-300 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <Image
              src="/brand/logo-mark.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-heading text-lg font-semibold text-white">
              Safar<span className="text-orange">Buddy</span>
            </span>
          </Link>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition active:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* User / guest card */}
          <div className="mx-5 rounded-2xl bg-white/[0.07] p-4">
            {user ? (
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-orange font-heading text-[15px] font-semibold text-white">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(displayName, user.email)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-[16px] font-semibold text-white">
                    {displayName ?? t("myAccountFallback")}
                  </span>
                  {user.email && (
                    <span className="block truncate text-[12px] text-white/55">
                      {user.email}
                    </span>
                  )}
                </span>
                <ChevronRightIcon className="h-4 w-4 text-white/35" />
              </Link>
            ) : (
              <div>
                <p className="font-heading text-[16px] font-semibold text-white">
                  {t("welcome")}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                  {t("welcomeSub")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="rounded-full border border-white/25 py-2.5 text-center font-heading text-[14px] font-semibold text-white transition active:bg-white/10"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="rounded-full bg-orange py-2.5 text-center font-heading text-[14px] font-semibold text-white transition active:scale-[0.97]"
                  >
                    {t("register")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Explore */}
          <SectionTitle>{t("secExplore")}</SectionTitle>
          <LinkRow href="/hotels" icon={<HotelIcon className={iconCls} />} label={t("hotels")} onNavigate={onClose} />
          <LinkRow href="/destinations" icon={<CompassIcon className={iconCls} />} label={t("destinations")} onNavigate={onClose} />
          <LinkRow href="/packages" icon={<PackageIcon className={iconCls} />} label={t("holidayPackages")} onNavigate={onClose} />
          <LinkRow href="/offers" icon={<TagIcon className={iconCls} />} label={t("offers")} onNavigate={onClose} />
          <LinkRow href="/list-your-property" icon={<PlusCircleIcon className={iconCls} />} label={t("listProperty")} onNavigate={onClose} />

          {/* My account (signed-in only) */}
          {user && (
            <>
              <SectionTitle>{t("secAccount")}</SectionTitle>
              <LinkRow href="/dashboard" icon={<DashboardIcon className={iconCls} />} label={t("dashboard")} onNavigate={onClose} />
              <LinkRow href="/dashboard/bookings" icon={<BookingsIcon className={iconCls} />} label={t("myBookings")} onNavigate={onClose} />
              <LinkRow href="/profile" icon={<AccountIcon className={iconCls} />} label={t("myProfile")} onNavigate={onClose} />
              <LinkRow href="/referral" icon={<GiftIcon className={iconCls} />} label={t("referEarn")} onNavigate={onClose} />
              {navAccess?.isHotelOwner && (
                <LinkRow href="/hotel-owner" icon={<StoreIcon className={iconCls} />} label={t("myProperty")} onNavigate={onClose} />
              )}
              {navAccess?.isVendor && (
                <LinkRow href="/vendor" icon={<StoreIcon className={iconCls} />} label={t("vendorDashboard")} onNavigate={onClose} />
              )}
              {navAccess?.isAdmin && (
                <LinkRow href="/admin" icon={<ShieldIcon className={iconCls} />} label={t("adminPanel")} onNavigate={onClose} />
              )}
            </>
          )}

          {/* Settings */}
          <SectionTitle>{t("secSettings")}</SectionTitle>
          <div className="px-5 py-3">
            <div className="flex items-center gap-4">
              <GlobeIcon className={iconCls} />
              <span className={labelCls}>{t("language")}</span>
              <div
                role="group"
                aria-label={t("language")}
                className="flex rounded-full bg-white/10 p-0.5"
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={lang === l.code}
                    onClick={() => setLang(l.code)}
                    className={`rounded-full px-3.5 py-1.5 font-heading text-[13px] font-semibold transition ${
                      lang === l.code ? "bg-orange text-white" : "text-white/70"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 pl-9 text-[11px] leading-relaxed text-white/40">
              {t("languageNote")}
            </p>
          </div>

          {showInstall && (
            <>
              <ActionRow
                icon={<DownloadIcon className={iconCls} />}
                label={t("installApp")}
                onClick={handleInstall}
              />
              {showIosHint && !installEvt && (
                <p className="px-5 pb-2 pl-14 text-[12px] leading-relaxed text-white/55">
                  {t("installIosHint")}
                </p>
              )}
            </>
          )}
          {canShare && (
            <ActionRow
              icon={<ShareIcon className={iconCls} />}
              label={t("shareApp")}
              onClick={handleShare}
            />
          )}

          {/* Help & support */}
          <SectionTitle>{t("secHelp")}</SectionTitle>
          <LinkRow href="/contact" icon={<HeadsetIcon className={iconCls} />} label={t("contactUs")} onNavigate={onClose} />
          <LinkRow
            plain
            href={`tel:${footerContact.supportPhone.replace(/\s+/g, "")}`}
            icon={<PhoneIcon className={iconCls} />}
            label={`${t("callUs")} · ${footerContact.supportPhone}`}
            onNavigate={onClose}
          />
          <LinkRow
            plain
            href={`mailto:${footerContact.supportEmail}`}
            icon={<MailIcon className={iconCls} />}
            label={t("emailUs")}
            onNavigate={onClose}
          />
          <p className="px-5 pt-1 pl-14 text-[11px] text-white/40">
            {footerContact.supportHours}
          </p>

          {/* About & legal */}
          <SectionTitle>{t("secAbout")}</SectionTitle>
          <LinkRow href="/about" icon={<InfoIcon className={iconCls} />} label={t("aboutUs")} onNavigate={onClose} />
          <LinkRow href="/privacy" icon={<LockIcon className={iconCls} />} label={t("privacy")} onNavigate={onClose} />
          <LinkRow href="/terms" icon={<DocIcon className={iconCls} />} label={t("terms")} onNavigate={onClose} />
          <LinkRow href="/refund-policy" icon={<ReceiptIcon className={iconCls} />} label={t("refund")} onNavigate={onClose} />

          {/* Logout */}
          {user && (
            <div className="mt-4 border-t border-white/10 pt-2">
              <ActionRow
                danger
                icon={<LogoutIcon className={iconCls} />}
                label={t("logout")}
                onClick={() => {
                  onClose();
                  signOut();
                }}
              />
            </div>
          )}

          <p className="mt-6 px-5 text-center text-[11px] text-white/35">
            {footerContent.copyrightText}
          </p>
        </div>
      </aside>
    </div>
  );
}
