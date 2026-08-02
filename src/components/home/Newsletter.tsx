"use client";

import { useState, type FormEvent } from "react";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import {
  newsletterFeatures,
  newsletterTrustBadges,
  newsletterContent,
} from "@/data/home";

type SubmitStatus = "idle" | "loading" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!EMAIL_PATTERN.test(email.trim())) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    // Placeholder submit logic — swap this block for a real call to
    // Supabase (edge function/table insert), Brevo, Resend, or Mailchimp.
    // The form UI and its loading/success/error states need no changes
    // once a real provider is wired in here.
    await new Promise((resolve) => setTimeout(resolve, 900));

    setStatus("success");
    setEmail("");
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="reveal relative overflow-hidden rounded-3xl border border-deep/10 bg-gradient-to-br from-white via-mist-2 to-white px-6 py-12 shadow-[0_30px_60px_-25px_rgba(11,47,92,0.25)] sm:px-10 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-orange/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Stay in the loop
          </span>
          <h2 className="mt-2 font-display text-3xl text-deep sm:text-4xl">
            {newsletterContent.heading}
          </h2>
          <p className="mt-3 text-[14px] text-ink/60">
            {newsletterContent.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {newsletterFeatures.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-deep shadow-sm backdrop-blur-sm"
              >
                <f.icon size={13} className="text-orange" aria-hidden />
                {f.label}
              </span>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <div className="relative flex-1">
              <Mail
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
                aria-hidden
              />
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                placeholder={newsletterContent.placeholder}
                className="focus-ring w-full rounded-full border border-deep/15 bg-white py-3 pl-11 pr-4 text-[13px] text-deep placeholder:text-ink/40"
                aria-invalid={status === "error"}
                aria-describedby="newsletter-status"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-deep px-6 py-3 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "loading" ? (
                newsletterContent.loadingLabel
              ) : (
                <>
                  {newsletterContent.submitLabel}
                  <Send size={14} aria-hidden />
                </>
              )}
            </button>
          </form>

          <div id="newsletter-status" aria-live="polite" className="mt-3 min-h-[20px]">
            {status === "success" && (
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-emerald-600">
                <CheckCircle2 size={15} aria-hidden />
                {newsletterContent.successMessage}
              </p>
            )}
            {status === "error" && (
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-red-500">
                <AlertCircle size={15} aria-hidden />
                {newsletterContent.errorMessage}
              </p>
            )}
          </div>

          <p className="mt-2 text-[11px] text-ink/45">
            {newsletterContent.privacyNotice}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-deep/10 pt-6">
            {newsletterTrustBadges.map((badge) => (
              <span
                key={badge.id}
                className="flex items-center gap-1.5 text-[11px] font-medium text-ink/50"
              >
                <badge.icon size={13} className="text-deep/50" aria-hidden />
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
