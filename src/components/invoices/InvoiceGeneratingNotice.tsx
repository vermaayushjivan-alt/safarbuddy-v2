// src/components/invoices/InvoiceGeneratingNotice.tsx
// INVOICE-02 — replaces the old flat "No invoice has been generated
// for this booking yet" message on both the customer dashboard invoice
// page and the new guest invoice page.
//
// Root cause being worked around (SESSION_HANDOFF.md, 2026-09-19/20
// entries): the invoice row is created inside the Cashfree webhook,
// which is a separate request from the one that lands the customer on
// this page — a customer can genuinely arrive here a few seconds
// before the webhook has run. That's a race, not a permanent failure,
// so the message must not read as final.
//
// This component polls by calling router.refresh(), which re-runs the
// server component that renders it — if the invoice has appeared by
// then, that server component renders <InvoiceView> instead of this
// notice on the next pass, and this component simply unmounts (the
// interval is cleared on unmount either way). Capped at 8 attempts /
// 5s apart (40s) to match typical webhook latency without polling
// forever; after the cap, this switches to a manual "Check again"
// button instead of continuing silently.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_AUTO_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 5000;

export default function InvoiceGeneratingNotice() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (attemptsRef.current >= MAX_AUTO_ATTEMPTS) {
      return;
    }

    const timer = setTimeout(() => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arms
    // on every attempts change only; router is stable from next/navigation.
  }, [attempts, router]);

  const givenUp = attempts >= MAX_AUTO_ATTEMPTS;

  return (
    <div className="rounded-2xl border border-deep/15 bg-white px-6 py-10 text-center">
      <p className="text-[14px] text-ink/60">
        {givenUp ? (
          <>
            Still generating your invoice. This can take a little longer
            than usual — please check again in a moment.
          </>
        ) : (
          <>
            Your invoice is being generated. This usually takes a few
            seconds after payment — this page will update on its own.
          </>
        )}
      </p>

      {givenUp ? (
        <button
          type="button"
          onClick={() => {
            attemptsRef.current = 0;
            setAttempts(0);
            router.refresh();
          }}
          className="focus-ring mt-4 inline-block rounded-lg border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Check again
        </button>
      ) : (
        <p className="mt-3 text-[11px] text-ink/40">Checking automatically…</p>
      )}
    </div>
  );
}

