const destinations = [
  { city: "Goa", code: "GOI", price: "3,499", hue: "from-orange/80" },
  { city: "Manali", code: "KUU", price: "4,199", hue: "from-sky/80" },
  { city: "Jaipur", code: "JAI", price: "2,299", hue: "from-deep/80" },
  { city: "Kerala", code: "COK", price: "5,899", hue: "from-orange-2/80" },
  { city: "Ladakh", code: "IXL", price: "6,499", hue: "from-sky-light/80" },
  { city: "Udaipur", code: "UDR", price: "2,899", hue: "from-deep-2/80" },
];

export default function Destinations() {
  return (
    <section className="bg-mist-2 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
          Where to next
        </span>
        <h2 className="mt-1 font-display text-3xl text-deep">
          Popular destinations
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {destinations.map((d) => (
            <a
              key={d.code}
              href="#"
              className="group overflow-hidden rounded-xl bg-white shadow-[0_14px_28px_-18px_rgba(11,47,92,0.35)] transition hover:-translate-y-1"
            >
              <div
                className={`flex h-24 items-end bg-gradient-to-br ${d.hue} to-deep/90 p-3`}
              >
                <span className="route-tag rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-deep">
                  {d.code}
                </span>
              </div>
              <div className="p-3">
                <p className="font-heading text-[14px] font-semibold text-deep">
                  {d.city}
                </p>
                <p className="mt-0.5 text-[12px] text-ink/55">
                  Flights from{" "}
                  <span className="font-display text-orange">
                    ₹{d.price}
                  </span>
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
