const columns = [
  {
    heading: "Book",
    links: ["Flights", "Hotels", "Bus", "Train", "Holiday Packages"],
  },
  {
    heading: "Services",
    links: ["Visa Assistance", "Travel Insurance", "Forex", "Travel Loan"],
  },
  {
    heading: "Company",
    links: ["About us", "Careers", "Support", "Terms & privacy"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-deep-2 pt-14 text-cream/80">
      <div className="mx-auto max-w-7xl px-6">
        <div className="ticket-notch flex flex-col items-center justify-between gap-4 rounded-xl bg-white/[0.06] p-6 ring-1 ring-white/15 sm:flex-row">
          <div>
            <p className="font-heading text-[15px] font-semibold text-cream">
              Fare drops, seat sales, and offers — straight to your inbox.
            </p>
          </div>
          <form className="flex w-full max-w-sm gap-2 sm:w-auto">
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-lg border border-white/20 bg-transparent px-4 py-2 text-[13px] text-cream placeholder:text-cream/40 outline-none focus:border-orange-2"
            />
            <button className="shrink-0 rounded-lg bg-orange px-4 py-2 font-heading text-[13px] font-semibold text-white">
              Subscribe
            </button>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 pb-10 sm:grid-cols-4">
          <div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 font-heading text-sm font-semibold text-cream">
              SB
            </span>
            <p className="mt-3 font-heading text-[15px] font-semibold text-cream">
              SafarBuddy
            </p>
            <p className="mt-1 text-[13px] text-cream/50">
              Ek ticket, poori duniya.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="font-heading text-[13px] font-semibold text-cream">
                {col.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[13px] text-cream/55 hover:text-cream"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="route-tag flex flex-col items-center justify-between gap-2 border-t border-white/10 py-5 text-[11px] text-cream/40 sm:flex-row">
          <span>© {new Date().getFullYear()} SAFARBUDDY TRAVEL PVT LTD</span>
          <span>MADE FOR THE NEXT DEPARTURE</span>
        </div>
      </div>
    </footer>
  );
}
