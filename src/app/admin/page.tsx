<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {sections.map((section) => (
      <Link
        key={section.href}
        href={section.href}
        className="focus-ring group rounded-2xl border border-deep/15 bg-white p-6 transition hover:border-deep/30 hover:shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]"
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-mist text-deep">
          <section.icon size={20} aria-hidden />
        </div>
        <h2 className="mt-4 font-heading text-[15px] font-semibold text-deep">
          {section.label}
        </h2>
        <p className="mt-1 text-[13px] text-ink/55">
          {section.description}
        </p>
      </Link>
    ))}
  </div>
</div>
