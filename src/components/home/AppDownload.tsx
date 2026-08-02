export default function AppDownload() {
  return (
    <section className="bg-mist-2 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Take it with you
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Your boarding pass, on your phone
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink/60">
            Get the SafarBuddy app for real-time flight status, offline
            tickets, and booking reminders that actually help.
          </p>
          <div className="mt-6 flex gap-3">
            <button className="rounded-xl bg-deep px-5 py-3 font-heading text-[13px] font-semibold text-cream">
              Download for iOS
            </button>
            <button className="rounded-xl border border-deep/20 px-5 py-3 font-heading text-[13px] font-semibold text-deep">
              Download for Android
            </button>
          </div>
        </div>

        <div className="ticket-notch mx-auto w-full max-w-xs rounded-2xl bg-deep p-6 text-cream shadow-[0_30px_50px_-20px_rgba(11,47,92,0.5)]">
          <p className="route-tag text-[11px] text-cream/60">MOBILE BOARDING PASS</p>
          <p className="mt-2 font-display text-2xl">SafarBuddy</p>
          <div className="ticket-perf mt-6 pl-4">
            <p className="text-[12px] text-cream/60">Gate opens for</p>
            <p className="font-heading text-lg font-semibold">
              Your next trip
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
