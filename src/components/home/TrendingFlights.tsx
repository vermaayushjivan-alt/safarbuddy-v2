"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  ArrowRight,
  Plane,
  Users,
  Luggage,
} from "lucide-react";

type Flight = {
  id: string;
  airline: string;
  airlineCode: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: "Non-stop" | "1 Stop";
  price: string;
  originalPrice: string;
  discount: string;
  seatsLeft: number;
  banner: string;
};

const flights: Flight[] = [
  {
    id: "del-dxb",
    airline: "IndiGo",
    airlineCode: "6E",
    originCode: "DEL",
    originCity: "Delhi",
    destCode: "DXB",
    destCity: "Dubai",
    departTime: "08:20",
    arriveTime: "10:35",
    duration: "3h 45m",
    stops: "Non-stop",
    price: "14,499",
    originalPrice: "18,999",
    discount: "24% OFF",
    seatsLeft: 4,
    banner: "from-sky to-deep",
  },
  {
    id: "bom-goi",
    airline: "Air India",
    airlineCode: "AI",
    originCode: "BOM",
    originCity: "Mumbai",
    destCode: "GOI",
    destCity: "Goa",
    departTime: "06:15",
    arriveTime: "07:25",
    duration: "1h 10m",
    stops: "Non-stop",
    price: "2,199",
    originalPrice: "3,199",
    discount: "31% OFF",
    seatsLeft: 7,
    banner: "from-orange to-orange-2",
  },
  {
    id: "del-bkk",
    airline: "Vistara",
    airlineCode: "UK",
    originCode: "DEL",
    originCity: "Delhi",
    destCode: "BKK",
    destCity: "Bangkok",
    departTime: "23:10",
    arriveTime: "07:45",
    duration: "6h 35m",
    stops: "1 Stop",
    price: "16,999",
    originalPrice: "21,499",
    discount: "21% OFF",
    seatsLeft: 3,
    banner: "from-deep-2 to-sky",
  },
  {
    id: "blr-sin",
    airline: "IndiGo",
    airlineCode: "6E",
    originCode: "BLR",
    originCity: "Bengaluru",
    destCode: "SIN",
    destCity: "Singapore",
    departTime: "01:35",
    arriveTime: "09:05",
    duration: "4h 30m",
    stops: "Non-stop",
    price: "12,499",
    originalPrice: "15,999",
    discount: "22% OFF",
    seatsLeft: 5,
    banner: "from-sky-light to-deep-2",
  },
  {
    id: "lko-bom",
    airline: "Air India Express",
    airlineCode: "IX",
    originCode: "LKO",
    originCity: "Lucknow",
    destCode: "BOM",
    destCity: "Mumbai",
    departTime: "14:20",
    arriveTime: "16:35",
    duration: "2h 15m",
    stops: "Non-stop",
    price: "3,499",
    originalPrice: "4,799",
    discount: "27% OFF",
    seatsLeft: 9,
    banner: "from-deep to-sky-light",
  },
  {
    id: "hyd-jai",
    airline: "IndiGo",
    airlineCode: "6E",
    originCode: "HYD",
    originCity: "Hyderabad",
    destCode: "JAI",
    destCity: "Jaipur",
    departTime: "09:45",
    arriveTime: "14:20",
    duration: "4h 35m",
    stops: "1 Stop",
    price: "4,299",
    originalPrice: "5,999",
    discount: "28% OFF",
    seatsLeft: 6,
    banner: "from-orange-2 to-deep",
  },
];

function FlightSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="skeleton h-3 w-1/3 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton h-8 w-16 rounded-lg" />
          <div className="skeleton h-3 w-20 rounded-full" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-1/2 rounded-lg" />
          <div className="skeleton h-9 w-1/2 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function EmptyFlights() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <Plane size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No trending flights right now
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        Our best fares refresh every day — check back soon.
      </p>
    </div>
  );
}

export default function TrendingFlights() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Best fares today
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Trending Flights
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            Find the best flight deals at unbeatable prices.
          </p>
        </div>
        <button
          type="button"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all flights
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading trending flights"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <FlightSkeleton key={i} />
          ))}
        </div>
      ) : flights.length === 0 ? (
        <EmptyFlights />
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Trending flights"
        >
          {flights.map((f, i) => (
            <div
              key={f.id}
              role="listitem"
              className="reveal hover-lift group overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-deep/10 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${f.banner} font-heading text-[11px] font-bold text-white`}
                  >
                    {f.airlineCode}
                  </div>
                  <span className="font-heading text-[13px] font-semibold text-deep">
                    {f.airline}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    f.stops === "Non-stop"
                      ? "bg-mist text-deep"
                      : "bg-cream text-orange"
                  }`}
                >
                  {f.stops}
                </span>
              </div>

              <div className="px-5 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-left">
                    <p className="font-display text-xl text-deep">
                      {f.departTime}
                    </p>
                    <p className="text-[12px] text-ink/50">{f.originCode}</p>
                  </div>

                  <div className="flex flex-1 flex-col items-center px-2">
                    <span className="flex items-center gap-1 text-[11px] text-ink/45">
                      <Clock size={11} aria-hidden />
                      {f.duration}
                    </span>
                    <div className="mt-1.5 flex w-full items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-deep/30" />
                      <span className="h-px flex-1 border-t border-dashed border-deep/25" />
                      <Plane
                        size={13}
                        className="rotate-90 text-orange"
                        aria-hidden
                      />
                      <span className="h-px flex-1 border-t border-dashed border-deep/25" />
                      <span className="h-1.5 w-1.5 rounded-full bg-deep/30" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-xl text-deep">
                      {f.arriveTime}
                    </p>
                    <p className="text-[12px] text-ink/50">{f.destCode}</p>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink/45">
                  <span>{f.originCity}</span>
                  <span>{f.destCity}</span>
                </div>
              </div>

              <div className="px-5 pt-4">
                <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-0.5 text-[11px] font-semibold text-deep">
                  <Users size={11} aria-hidden />
                  Only {f.seatsLeft} seats left
                </span>
              </div>

              <div className="p-5 pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="flex items-center gap-1 text-[11px] text-ink/45">
                      <Luggage size={11} aria-hidden />
                      Starting fare
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl text-orange">
                        ₹{f.price}
                      </span>
                      <span className="text-[12px] text-ink/40 line-through">
                        ₹{f.originalPrice}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                    {f.discount}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="focus-ring flex-1 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist active:scale-[0.98]"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="focus-ring flex-1 rounded-xl bg-deep py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.98]"
                  >
                    Book now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="focus-ring mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep sm:hidden"
      >
        View all flights
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
