// src/components/payment/PayNowButton.tsx
// PAY-01 — Client component for Cashfree hosted checkout initiation.
//
// Calls initiatePayment() server action → receives paymentSessionId →
// loads Cashfree JS SDK from CDN → redirects to Cashfree hosted checkout.
//
// No Cashfree credentials are used here.
// Amount and currency are NOT accepted from props or user input.
// paymentSessionId is a short-lived session token — not a secret.

'use client';

import { useState } from 'react';
import { initiatePayment } from '@/lib/actions/payment.actions';

interface PayNowButtonProps {
  bookingId: string;
}

// Cashfree JS SDK type — loaded from CDN at runtime.
// We declare a minimal interface so TypeScript is satisfied
// without installing the Cashfree npm package.
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
        throw new Error('Cashfree checkout could not be loaded. Please try again.');
      }

      // 3. Initialise Cashfree SDK in sandbox or production mode.
      //    Mode is derived server-side — client always uses 'sandbox'
      //    during testing; production switch is controlled via CASHFREE_ENV.
      //    We use a separate NEXT_PUBLIC variable so the client knows the mode
      //    without exposing credentials.
      const mode =
        process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production'
          ? 'production'
          : 'sandbox';

      const cashfree = window.Cashfree({ mode });

      // 4. Redirect to Cashfree hosted checkout using the paymentSessionId.
      //    returnUrl matches the server-side order_meta.return_url.
      const checkoutResult = await cashfree.checkout({
        paymentSessionId: result.paymentSessionId,
        returnUrl: `${window.location.origin}/payment/success?order_id=${result.cfOrderId}`,
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
    // Note: setLoading(false) is intentionally NOT called on success
    // because Cashfree redirects the page — keeping the button in
    // loading state prevents double-clicks during the redirect.
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

// ---------------------------------------------------------------------------
// loadCashfreeScript
// Loads the Cashfree JS SDK from CDN if not already present.
// Resolves immediately if the script is already loaded.
// ---------------------------------------------------------------------------

function loadCashfreeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const existing = document.getElementById('cashfree-js-sdk');
    if (existing) {
      // Script tag exists but SDK not ready yet — wait for load.
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
