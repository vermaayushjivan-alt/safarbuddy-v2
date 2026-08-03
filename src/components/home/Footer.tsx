"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Clock, ArrowUp } from "lucide-react";
import {
  footerSocialLinks,
  footerLinkColumns,
  footerTrustBadges,
  paymentMethods,
  footerContact,
  footerContent,
  popularSearches,
  footerAppLinks,
} from "@/data/home";

export default function Footer() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="border-t border-deep/10 bg-deep text-cream">
      {/* Popular searches (SEO footer) */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h3 className="font-heading text-[12px] font-semibold uppercase tracking-wide text-cream/50">
          {footerContent.popularSearchesLabel}
        </h3>
        <nav
          aria-label={footerContent.popularSearchesLabel}
          className="mt-3 flex flex-wrap gap-x-5 gap-y-2"
        >
          {popularSearches.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="focus-ring rounded text-[12px] text-cream/60 transition hover:text-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto h-px max-w-7xl bg-cream/10" />

      {/* Trust badges */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 sm:justify-between">
          {footerTrustBadges.map((badge) => (
            <li
              key={badge.id}
              className="flex items-center gap-2 text-[12px] font-medium text-cream/80"
            >
              <badge.icon size={16} className="text-orange" aria-hidden />
              {badge.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto h-px max-w-7xl bg-cream/10" />

      {/* Main columns */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1: brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="font-display text-2xl text-cream">
              SafarBuddy
            </span>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-cream/60">
              {footerContent.description}
            </p>

            <address className="mt-5 space-y-2 not-italic">
              <a
                href={`mailto:${footerContact.supportEmail}`}
                className="focus-ring flex items-center gap-2 rounded text-[12px] text-cream/70 transition hover:text-cream"
              >
                <Mail size={14} className="shrink-0 text-orange" aria-hidden />
                {footerContact.supportEmail}
              </a>
              <a
                href={`tel:${footerContact.supportPhone.replace(/\s+/g, "")}`}
                className="focus-ring flex items-center gap-2 rounded text-[12px] text-cream/70 transition hover:text-cream"
              >
                <Phone size={14} className="shrink-0 text-orange" aria-hidden />
                {footerContact.supportPhone}
              </a>
              <span className="flex items-start gap-2 text-[12px] text-cream/70">
                <MapPin
                  size={14}
                  className="mt-0.5 shrink-0 text-orange"
                  aria-hidden
                />
                {footerContact.address}
              </span>
              <span className="flex items-start gap-2 text-[12px] text-cream/70">
                <Clock
                  size={14}
                  className="mt-0.5 shrink-0 text-orange"
                  aria-hidden
                />
                {footerContact.supportHours}
              </span>
            </address>

            <ul className="mt-5 flex items-center gap-3">
              {footerSocialLinks.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cream transition hover:-translate-y-0.5 hover:bg-orange"
                  >
                    <social.icon size={15} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columns 2-5: link groups */}
          {footerLinkColumns.map((column) => (
            <nav key={column.id} aria-label={column.title}>
              <h3 className="font-heading text-[13px] font-semibold text-cream">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="focus-ring rounded text-[13px] text-cream/60 transition hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto h-px max-w-7xl bg-cream/10" />

      {/* Payments + app links */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cream/45">
              We accept
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <li
                  key={method.id}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-cream/80"
                >
                  <method.icon size={13} aria-hidden />
                  {method.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cream/45 sm:text-right">
              Get the app
            </p>
            <div className="mt-3 flex gap-2.5 sm:justify-end">
              {footerAppLinks.map((badge) => (
                <span
                  key={badge.id}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-cream/80"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto h-px max-w-7xl bg-cream/10" />

      {/* Bottom bar */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-[12px] text-cream/50">{footerContent.copyrightText}</p>
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-cream/20 px-4 py-2 text-[12px] font-medium text-cream/80 transition hover:bg-white/10"
        >
          Back to top
          <ArrowUp size={13} aria-hidden />
        </button>
      </div>
    </footer>
  );
}
