'use client';

// LAUNCH-02 — Cloudflare Turnstile widget (explicit render).
// Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (feature
// gated off, matches verifyCaptcha() on the server). Also renders a hidden
// input named "cf-turnstile-response" so plain <form action={...}> forms
// get the token in FormData, while custom forms can use onToken.
// Change `resetKey` to clear the widget after a failed submit (tokens are
// single-use).

import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    }
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function TurnstileWidget({
  onToken,
  resetKey,
}: {
  onToken?: (token: string) => void;
  resetKey?: unknown;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey as string,
        theme: 'light',
        callback: (t) => {
          setToken(t);
          onToken?.(t);
        },
        'expired-callback': () => {
          setToken('');
          onToken?.('');
        },
        'error-callback': () => {
          setToken('');
          onToken?.('');
        },
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`
      );
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderWidget);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // Reset after a failed submit.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      setToken('');
      onToken?.('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (!siteKey) return null;

  return (
    <div>
      <div ref={containerRef} />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
    </div>
  );
}
