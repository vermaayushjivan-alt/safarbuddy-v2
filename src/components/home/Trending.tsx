"use client";

import { useState } from "react";

const hotels = [
  { name: "Taj Exotica", place: "Goa", rating: "4.7", price: "8,999" },
  { name: "Fairmont", place: "Jaipur", rating: "4.8", price: "6,499" },
  { name: "The Leela", place: "Kovalam", rating: "4.6", price: "7,299" },
  { name: "Wildflower Hall", place: "Shimla", rating: "4.9", price: "9,999" },
];

const flights = [
  { route: "LKO → GOI", airline: "IndiGo", duration: "2h 40m", price: "3,499" },
  { route: "DEL → BOM", airline: "Air India", duration: "2h 05m", price: "2,899" },
  { route: "LKO → BLR", airline: "Vistara", duration: "2h 55m", price: "4,199" },
  { route: "DEL → GOI", airline: "SpiceJet", duration: "2h 20m", price: "3,199" },
];

export default function Trending() {
  const [tab, setTab] = useState<"hotels" | "flights">("hotels");

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Trending this week
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Handpicked for your next trip
          </h2>
        </div>

        <div className="flex gap-2 rounded-full bg-mist p-1">
          {(["hotels", "flights"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 font-heading text-[13px] font-medium capitalize transition ${
                tab === t ? "bg-deep text-cream" : "text-deep/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "hotels" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {hotels.map((h) => (
            <div
              key={h.name}
              className="ticket-notch rounded-xl bg-white p-5 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]"
            >
              <div className="h-28 rounded-lg bg-gradient-to-br from-mist to-mist-2" />
              <p className="mt-3 font-heading text-[15px] font-semibold text-deep">
                {h.name}
              </p>
              <p className="text-[12px] text-ink/55">{h.place}</p>
              <div className="ticket-perf mt-3 flex items-center justify-between pl-4">
                <span className="route-tag text-[12px] text-deep/70">
                  ★ {h.rating}
                </span>
                <span className="font-display text-[15px] text-orange">
                  ₹{h.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {flights.map((f) => (
            <div
              key={f.route}
              className="ticket-notch rounded-xl bg-white p-5 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]"
            >
              <p className="route-tag text-[15px] font-medium text-deep">
                {f.route}
              </p>
              <p className="mt-1 text-[12px] text-ink/55">
                {f.airline} · {f.duration}
              </p>
              <div className="ticket-perf mt-3 flex items-center justify-between pl-4">
                <span className="text-[12px] text-ink/50">Starting</span>
                <span className="font-display text-[15px] text-orange">
                  ₹{f.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
