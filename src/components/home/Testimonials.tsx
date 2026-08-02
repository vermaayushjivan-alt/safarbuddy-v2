const reviews = [
  {
    name: "Ananya S.",
    route: "LKO → GOI",
    quote:
      "Booking se lekar check-in tak, sab kuch ek hi app mein — no juggling between five tabs anymore.",
  },
  {
    name: "Rohit K.",
    route: "DEL → BOM",
    quote:
      "Price alerts saved me real money on my Mumbai trip, and refunds were quicker than I expected.",
  },
  {
    name: "Meera P.",
    route: "LKO → JAI",
    quote:
      "Planned a whole family holiday package in one sitting. The itinerary builder is genuinely useful.",
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
        Fellow travellers
      </span>
      <h2 className="mt-1 font-display text-3xl text-deep">
        Stories from the last row
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {reviews.map((r) => (
          <div
            key={r.name}
            className="ticket-notch rounded-xl bg-mist-2 p-6 shadow-[0_14px_28px_-18px_rgba(11,47,92,0.3)]"
          >
            <p className="route-tag text-[12px] text-deep/60">{r.route}</p>
            <p className="mt-3 font-display text-[17px] leading-relaxed text-ink/85">
              "{r.quote}"
            </p>
            <div className="ticket-perf mt-5 pl-4">
              <span className="font-heading text-[13px] font-semibold text-deep">
                {r.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
