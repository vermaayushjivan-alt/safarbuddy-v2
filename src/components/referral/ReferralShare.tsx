'use client';

// REFERRAL-01 — copy / WhatsApp share buttons for the /referral page.

import { useState } from 'react';

interface ReferralShareProps {
  code: string;
  link: string;
  friendPercent: number;
}

export function ReferralShare({ code, link, friendPercent }: ReferralShareProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  async function copy(text: string, which: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked (older browsers / insecure context).
      // The code and link are visible on screen, so the user can still
      // select and copy them by hand — nothing else to do here.
    }
  }

  const whatsappText = `Join SafarBuddy and get ${friendPercent}% off your trip! Sign up with my link: ${link}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
          Your referral code
        </p>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-display text-2xl tracking-widest text-deep">{code}</span>
          <button
            type="button"
            onClick={() => copy(code, 'code')}
            className="rounded-lg border border-deep/15 px-3 py-1.5 text-[13px] font-medium text-deep hover:bg-mist"
          >
            {copied === 'code' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink/40">
          Your referral link
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="break-all text-[14px] text-ink/70">{link}</span>
          <button
            type="button"
            onClick={() => copy(link, 'link')}
            className="rounded-lg border border-deep/15 px-3 py-1.5 text-[13px] font-medium text-deep hover:bg-mist"
          >
            {copied === 'link' ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-xl bg-deep px-5 py-2.5 text-[14px] font-medium text-cream hover:opacity-90"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}
