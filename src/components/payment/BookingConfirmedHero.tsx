'use client';

// ROOT PATH: src/components/payment/BookingConfirmedHero.tsx
// Payment-success hero in the style of PhonePe / Google Pay "payment done":
// a green circle pops in, a ring pulses out, the tick draws itself and a
// small confetti burst fires. Pure CSS (no library). Respects
// prefers-reduced-motion (shows the finished state with no motion).

import { useEffect } from 'react';
import type { CSSProperties } from 'react';

const CONFETTI_COLORS = ['#16a34a', '#f97316', '#38bdf8', '#facc15', '#0b2f5c', '#ec4899'];
const CONFETTI_COUNT = 14;

interface BookingConfirmedHeroProps {
  amountLabel?: string | null;
  paidAtLabel?: string | null;
}

export default function BookingConfirmedHero({
  amountLabel,
  paidAtLabel,
}: BookingConfirmedHeroProps) {
  // Short haptic tick on phones, like a payment app. Ignored where unsupported.
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(60);
      }
    } catch {
      /* not supported — nothing to do */
    }
  }, []);

  const confetti = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = (i / CONFETTI_COUNT) * Math.PI * 2;
    const radius = 78 + (i % 3) * 16;
    return {
      key: i,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: 0.55 + (i % 4) * 0.04,
      round: i % 2 === 0,
    };
  });

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#e8f8ee] via-[#f3fbf6] to-transparent px-4 pb-6 pt-12 text-center sm:pt-16">
      <style>{`
        @keyframes bc-pop { 0% { transform: scale(0); } 60% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @keyframes bc-ring { 0% { transform: scale(0.7); opacity: 0.55; } 100% { transform: scale(2.1); opacity: 0; } }
        @keyframes bc-draw { to { stroke-dashoffset: 0; } }
        @keyframes bc-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bc-burst {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--bc-x), var(--bc-y)) scale(1); opacity: 0; }
        }
        .bc-circle { animation: bc-pop 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
        .bc-ring { animation: bc-ring 1.3s ease-out 0.3s both; }
        .bc-ring-2 { animation: bc-ring 1.3s ease-out 0.7s both; }
        .bc-tick { stroke-dasharray: 48; stroke-dashoffset: 48; animation: bc-draw 0.45s ease-out 0.45s forwards; }
        .bc-dot { animation: bc-burst 0.95s ease-out both; }
        .bc-rise-1 { animation: bc-rise 0.5s ease-out 0.7s both; }
        .bc-rise-2 { animation: bc-rise 0.5s ease-out 0.85s both; }
        .bc-rise-3 { animation: bc-rise 0.5s ease-out 1s both; }
        @media (prefers-reduced-motion: reduce) {
          .bc-circle, .bc-ring, .bc-ring-2, .bc-dot, .bc-rise-1, .bc-rise-2, .bc-rise-3 { animation: none; }
          .bc-ring, .bc-ring-2, .bc-dot { display: none; }
          .bc-tick { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
        <span className="bc-ring absolute h-24 w-24 rounded-full bg-[#22c55e]/40" aria-hidden />
        <span className="bc-ring-2 absolute h-24 w-24 rounded-full bg-[#22c55e]/30" aria-hidden />

        {confetti.map((c) => (
          <span
            key={c.key}
            aria-hidden
            className={`bc-dot absolute left-1/2 top-1/2 h-2 w-2 ${c.round ? 'rounded-full' : 'rounded-[2px]'}`}
            style={
              {
                backgroundColor: c.color,
                animationDelay: `${c.delay}s`,
                ['--bc-x' as string]: `${c.x}px`,
                ['--bc-y' as string]: `${c.y}px`,
              } as CSSProperties
            }
          />
        ))}

        <div className="bc-circle relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] shadow-[0_14px_30px_-10px_rgba(21,128,61,0.65)]">
          <svg
            viewBox="0 0 52 52"
            className="h-12 w-12"
            fill="none"
            stroke="#ffffff"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path className="bc-tick" d="M13 27 L22 36 L40 16" />
          </svg>
        </div>
      </div>

      <h1 className="bc-rise-1 mt-6 font-heading text-4xl font-extrabold leading-tight tracking-tight text-deep sm:text-5xl">
        Booking Confirmed
      </h1>

      <p className="bc-rise-2 mt-2 text-[15px] font-semibold text-[#15803d]">
        Payment successful
      </p>

      {amountLabel && (
        <div className="bc-rise-3 mt-4">
          <p className="font-heading text-3xl font-bold text-deep">{amountLabel}</p>
          {paidAtLabel && (
            <p className="mt-1 text-[12px] text-ink/55">Paid on {paidAtLabel}</p>
          )}
        </div>
      )}
    </section>
  );
}
