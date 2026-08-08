// src/components/payment/PayNowButton.tsx
// PAY-01 — Client component for Cashfree hosted checkout initiation.
//
// Calls initiatePayment() server action → receives paymentSessionId →
// loads Cashfree JS SDK from CDN → redirects to Cashfree hosted checkout.
//
// No Cashfree credentials are used here.
// Amount and currency are NOT accepted from props or user input.
// paymentSessionId is a short-lived session token — not a secret.
//
// Return URL points to /payment/pending which shows a neutral
// "verifying payment" state. The webhook is the authoritative processor.

'use client';

import { useState } from 'react';
import { initiatePayment } from '@/lib/actions/payment.actions';

interface PayNowButtonProps {
  bookingId: string;
}

// Cashfree JS SDK type — loaded from CDN at runtime.
declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (options: {
        paymentSessionId: string;
        returnUrl: string;
      }) => Promise<{ error?: { message?: string } }>;
    };
  }
}

export function PayNowButton({ bookingId }: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayNow() {
    setLoading(true);
    setError(null);

    try {
      // 1. Call server action — auth, ownership, Cashfree order creation.
      //    Amount and currency come from the server. Never from this component.
      const result = await initiatePayment(bookingId);

      // 2. Load Cashfree JS SDK from CDN if not already present.
      await loadCashfreeScript();

      if (!window.Cashfree) {
        throw new Error(
          'Cashfree checkout could not be loaded. Please try again.'
        );
      }

      // 3. Initialise Cashfree SDK mode from public env variable.
      const mode =
        process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production'
          ? 'production'
          : 'sandbox';

      const cashfree = window.Cashfree({ mode });

      // 4. Return URL points to /payment/pending — a neutral verification
      //    page. The webhook is the authoritative payment processor.
      //    We do NOT claim success or failure from the return URL alone.
      const returnUrl =
        `${window.location.origin}/payment/pending` +
        `?order_id=${result.cfOrderId}` +
        `&booking_id=${bookingId}`;

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: result.paymentSessionId,
        returnUrl,
      });

      if (checkoutResult?.error?.message) {
        throw new Error(checkoutResult.error.message);
      }

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Payment could not be initiated. Please try again.';
      setError(message);
      setLoading(false);
    }
    // setLoading(false) not called on success — Cashfree redirects the page.
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handlePayNow}
        disabled={loading}
        className="w-full rounded-xl bg-orange px-6 py-3 font-heading text-[15px] font-bold text-white transition hover:bg-orange/90 disabled:opacity-60"
      >
        {loading ? 'Preparing payment…' : 'Pay Now'}
      </button>
    </div>
  );
}

function loadCashfreeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const existing = document.getElementById('cashfree-js-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Cashfree SDK'))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'cashfree-js-sdk';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });
}
