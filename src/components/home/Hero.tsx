"use client";

// HOME-HOTEL-SEARCH-01: Hotels is now the primary/default tab and the
// only one with a real, functional search — matching the current
// product priority (hotels first; other verticals have no backend yet).
// Previously every tab rendered the same hardcoded flight-style fields
// (From/To/Date/Travellers) with a fake "Search" button that only did a
// setTimeout and went nowhere, regardless of which tab was active. That
// was replaced with the shared HotelSearchBar (RULE 1 — same component
// used on /hotels), which actually navigates to real search results.
// The other verticals (Flights/Bus/Train/Holiday/Visa/Forex) have no
// booking backend in this repo (see PROJECT_STATUS.md) — rather than
// leave fake fields that silently do nothing, they show an honest
// "Coming soon" state.

import { useState } from "react";
import { HotelSearchBar } from "@/components/public/HotelSearchBar";

const tabs = [
  "Hotels",
  "Flights",
  "Bus",
  "Train",
  "Holiday",
  "Visa",
  "Forex",
];

export default function Hero() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-deep via-deep to-deep-2 pb-28 pt-16 text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="reveal max-w-2xl">
          <span className="route-tag inline-block rounded-full border border-white/25 px-3 py-1 text-xs text-cream/80">
            STAYS ACROSS INDIA · ONE SEARCH
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] sm:text-5xl">
            Apna agla stay dhoondo.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-cream/75">
            Hotels, homestays aur resorts — sahi jagah, sahi kimat.
            Search karo, book karo, nishchint ho jao.
          </p>
        </div>

        {/* Search card */}
        <div
          className="reveal ticket-notch relative mx-auto mt-10 max-w-4xl rounded-2xl bg-white text-ink shadow-[0_30px_60px_-20px_rgba(11,47,92,0.55)]"
          style={{ animationDelay: "120ms" }}
        >
          <div
            role="tablist"
            aria-label="Travel type"
            className="flex flex-wrap gap-1 border-b border-dashed border-deep/15 px-5 pt-4 sm:px-7"
          >
            {tabs.map((tab, i) => (
              <button
                key={tab}
                role="tab"
                type="button"
                aria-selected={activeTab === i}
                onClick={() => setActiveTab(i)}
                className={`focus-ring rounded-t-lg px-4 py-2 font-heading text-[13px] font-medium transition ${
                  activeTab === i
                    ? "bg-mist text-deep"
                    : "text-ink/50 hover:text-deep"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 0 ? (
            <HotelSearchBar variant="hero" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center sm:px-7">
              <p className="font-heading text-[15px] font-semibold text-deep">
                {tabs[activeTab]} booking is coming soon
              </p>
              <p className="max-w-sm text-[13px] text-ink/55">
                Hotels are live right now — we&apos;re building{" "}
                {tabs[activeTab].toLowerCase()} next.
              </p>
            </div>
          )}

          <div className="route-tag flex items-center justify-between border-t border-dashed border-deep/15 px-6 py-3 text-[11px] text-ink/40 sm:px-7">
            <span>SAFARBUDDY · VERIFIED STAYS</span>
            <span>NO HIDDEN FEES</span>
          </div>
        </div>
      </div>
    </section>
  );
}
