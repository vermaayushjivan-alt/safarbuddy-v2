const packages = [
  {
    title: "Goa Beach Escape",
    nights: "4N / 5D",
    includes: "Flights + Stay + Breakfast",
    price: "14,999",
  },
  {
    title: "Kerala Backwaters",
    nights: "5N / 6D",
    includes: "Houseboat + Resort + Transfers",
    price: "22,499",
  },
  {
    title: "Himachal Snow Trail",
    nights: "6N / 7D",
    includes: "Manali + Shimla + Sightseeing",
    price: "18,999",
  },
];

export default function Packages() {
  return (
    <section className="bg-deep py-16 text-cream">
      <div className="mx-auto max-w-7xl px-6">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange-2">
          Ready-made itineraries
        </span>
        <h2 className="mt-1 font-display text-3xl">Holiday packages</h2>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {packages.map((p) => (
            <div
              key={p.title}
              className="ticket-notch rounded-xl bg-white/[0.06] p-6 backdrop-blur-sm ring-1 ring-white/15"
            >
              <p className="font-heading text-lg font-semibold">{p.title}</p>
              <p className="route-tag mt-1 text-[12px] text-cream/60">
                {p.nights}
              </p>
              <p className="mt-3 text-[13px] text-cream/75">{p.includes}</p>
              <div className="mt-5 flex items-center justify-between border-t border-dashed border-white/20 pt-4">
                <span className="text-[12px] text-cream/60">From</span>
                <span className="font-display text-xl text-orange-2">
                  ₹{p.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
