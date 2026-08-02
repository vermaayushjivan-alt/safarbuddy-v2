"use client";

import {
  ArrowRight,
  QrCode,
  PlayCircle,
  Apple,
  Wifi,
  Battery,
  Signal,
  Search,
  BellRing,
} from "lucide-react";
import { appBenefits, storeBadges, appDownloadContent } from "@/data/home";

export default function AppDownload() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <style>{`
        @keyframes appDownloadFloat {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-14px) rotate(-1deg); }
        }
        .app-download-float {
          animation: appDownloadFloat 6s ease-in-out infinite;
        }
      `}</style>

      <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-deep to-deep-2 px-6 py-12 shadow-[0_30px_60px_-25px_rgba(11,47,92,0.55)] sm:px-10 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-orange/20 blur-3xl" />

        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
              Get the app
            </span>
            <h2 className="mt-2 font-display text-3xl text-cream sm:text-4xl">
              {appDownloadContent.heading}
            </h2>
            <p className="mt-3 max-w-md text-[14px] text-cream/70">
              {appDownloadContent.subtitle}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {appBenefits.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm"
                >
                  <b.icon size={16} className="shrink-0 text-orange" aria-hidden />
                  <span className="text-[12px] font-medium text-cream/90">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-orange px-5 py-3 font-heading text-[13px] font-semibold text-white transition hover:bg-orange-2 active:scale-[0.98]"
              >
                {appDownloadContent.primaryCta}
                <ArrowRight size={14} aria-hidden />
              </button>
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-cream/25 bg-white/5 px-5 py-3 font-heading text-[13px] font-semibold text-cream backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98]"
              >
                {appDownloadContent.secondaryCta}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {storeBadges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  className="focus-ring flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 backdrop-blur-sm transition hover:bg-black/55 active:scale-[0.98]"
                >
                  {badge.id === "google-play" ? (
                    <PlayCircle size={20} className="text-cream" aria-hidden />
                  ) : (
                    <Apple size={20} className="text-cream" aria-hidden />
                  )}
                  <span className="text-left leading-tight">
                    <span className="block text-[9px] text-cream/60">
                      {badge.eyebrow}
                    </span>
                    <span className="block font-heading text-[13px] font-semibold text-cream">
                      {badge.label}
                    </span>
                  </span>
                </button>
              ))}

              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream">
                  <QrCode size={24} className="text-deep" aria-hidden />
                </div>
                <span className="text-[11px] leading-tight text-cream/70">
                  {appDownloadContent.qrLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="app-download-float relative w-[220px] rounded-[2.2rem] border-4 border-white/15 bg-deep-2/60 p-2.5 shadow-[0_25px_50px_-15px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:w-[250px]">
              <div className="absolute left-1/2 top-2.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-deep-2/80" />
              <div className="overflow-hidden rounded-[1.7rem] bg-cream">
                <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-medium text-deep/70">
                  <span>9:41</span>
                  <span className="flex items-center gap-1">
                    <Signal size={11} aria-hidden />
                    <Wifi size={11} aria-hidden />
                    <Battery size={12} aria-hidden />
                  </span>
                </div>

                <div className="px-4 pb-5 pt-4">
                  <p className="font-heading text-[13px] font-bold text-deep">
                    SafarBuddy
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-full bg-mist px-3 py-2">
                    <Search size={12} className="text-deep/50" aria-hidden />
                    <span className="text-[10px] text-deep/40">
                      Search flights, hotels...
                    </span>
                  </div>

                  <div className="mt-4 h-20 w-full rounded-xl bg-gradient-to-br from-sky to-deep" />

                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-orange to-orange-2" />
                    <div className="flex-1">
                      <div className="h-2 w-3/4 rounded-full bg-deep/15" />
                      <div className="mt-1.5 h-2 w-1/2 rounded-full bg-deep/10" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-deep-2 to-sky" />
                    <div className="flex-1">
                      <div className="h-2 w-2/3 rounded-full bg-deep/15" />
                      <div className="mt-1.5 h-2 w-1/3 rounded-full bg-deep/10" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-3 top-16 grid h-9 w-9 place-items-center rounded-full bg-orange text-white shadow-lg">
                <BellRing size={16} aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
