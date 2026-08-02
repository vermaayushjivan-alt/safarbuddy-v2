"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const tabs = [
  "Flights",
  "Hotels",
  "Bus",
  "Train",
  "Holiday",
  "Visa",
  "Forex",
];

export default function Hero() {
  const [activeTab, setActiveTab] = useState(0);
  const [searching, setSearching] = useState(false);

  function handleSearch() {
    setSearching(true);
    window.setTimeout(() => setSearching(false), 900);
  }

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
            LKO ⇢ ANYWHERE · ONE BOOKING
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] sm:text-5xl">
            Ek ticket, poori duniya.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-cream/75">
            Flights, hotels, bus, train aur holiday packages — sab kuch ek
            hi boarding pass jaisi search se. Book karo, relax karo, safar
            karo.
          </p>
        </div>

        {/* Boarding pass search card */}
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

          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-7 lg:grid-cols-5">
            <div className="block lg:col-span-1">
              <label
                htmlFor="from-city"
                className="text-[11px] font-medium uppercase tracking-wide text-ink/45"
              >
                From
              </label>
              <input
                id="from-city"
                name="from-city"
                type="text"
                defaultValue="Lucknow (LKO)"
                className="focus-ring mt-1 w-full border-b border-ink/15 bg-transparent pb-2 font-heading text-[15px] font-medium text-ink outline-none focus:border-orange"
              />
            </div>
            <div className="block lg:col-span-1">
              <label
                htmlFor="to-city"
                className="text-[11px] font-medium uppercase tracking-wide text-ink/45"
              >
                To
              </label>
              <input
                id="to-city"
                name="to-city"
                type="text"
                defaultValue="Goa (GOI)"
                className="focus-ring mt-1 w-full border-b border-ink/15 bg-transparent pb-2 font-heading text-[15px] font-medium text-ink outline-none focus:border-orange"
              />
            </div>
            <div className="block lg:col-span-1">
              <label
                htmlFor="departure-date"
                className="text-[11px] font-medium uppercase tracking-wide text-ink/45"
              >
                Departure
              </label>
              <input
                id="departure-date"
                name="departure-date"
                type="text"
                defaultValue="12 Aug"
                className="focus-ring mt-1 w-full border-b border-ink/15 bg-transparent pb-2 font-heading text-[15px] font-medium text-ink outline-none focus:border-orange"
              />
            </div>
            <div className="block lg:col-span-1">
              <label
                htmlFor="travellers"
                className="text-[11px] font-medium uppercase tracking-wide text-ink/45"
              >
                Travellers
              </label>
              <input
                id="travellers"
                name="travellers"
                type="text"
                defaultValue="1 Adult, Economy"
                className="focus-ring mt-1 w-full border-b border-ink/15 bg-transparent pb-2 font-heading text-[15px] font-medium text-ink outline-none focus:border-orange"
              />
            </div>

            <div className="flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                aria-busy={searching}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-orange py-3 font-heading text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,43,0.8)] transition hover:bg-orange-2 active:scale-[0.98] disabled:opacity-80"
              >
                {searching && (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                )}
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </div>

          <div className="route-tag flex items-center justify-between border-t border-dashed border-deep/15 px-6 py-3 text-[11px] text-ink/40 sm:px-7">
            <span>PNR · SB-{new Date().getFullYear()}-DEMO</span>
            <span>NO HIDDEN FEES</span>
          </div>
        </div>
      </div>
    </section>
  );
}
