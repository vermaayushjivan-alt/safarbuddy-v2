'use client';

// ROOT PATH: src/components/public/HotelInquiryForm.tsx
// PILOT-01 — no-login enquiry form. 4 fields only (name, mobile, dates,
// guests) to keep friction low for ad traffic. After sending, the visitor can
// also continue on WhatsApp with their details prefilled.

import { useState, useTransition, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { submitHotelInquiry } from '@/app/actions/inquiry.actions';
import TurnstileWidget from '@/components/security/TurnstileWidget';
import {
  buildHotelWhatsAppLink,
  toWhatsAppNumber,
} from '@/components/public/HotelWhatsAppButton';
import { footerContact } from '@/data/home';
import { trackMetaEvent } from '@/lib/analytics/meta-pixel';

type Props = {
  hotelId: string;
  hotelName: string;
  hotelSlug: string;
  city?: string | null;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: string;
  roomTypeId?: string | null;
  /** Ad tag (utm_campaign). Stored with the lead so you know which ad it came from. */
  source?: string;
  title?: string;
  subtitle?: string;
};

const FIELD =
  'focus-ring w-full rounded-xl border border-deep/15 bg-white px-3.5 py-2.5 text-[14px] text-deep outline-none transition focus:border-deep/40';
const LABEL = 'mb-1 block text-[12px] font-semibold text-deep/70';

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function HotelInquiryForm({
  hotelId,
  hotelName,
  hotelSlug,
  city,
  defaultCheckIn = '',
  defaultCheckOut = '',
  defaultGuests = '2',
  roomTypeId = null,
  source,
  title = 'Send an enquiry',
  subtitle = 'No login needed. Share your details and we will contact you shortly.',
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(defaultGuests || '2');
  const [website, setWebsite] = useState(''); // honeypot
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const minDate = todayIso();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitHotelInquiry(
        {
          hotelId,
          name,
          phone,
          checkIn,
          checkOut,
          guests,
          roomTypeId: roomTypeId ?? '',
          source: source ?? '',
          website,
        },
        captchaToken
      );

      if (result.success) {
        // PILOT-02: tell Meta a real lead happened (drives ad optimisation).
        trackMetaEvent('Lead', {
          content_name: hotelName,
          content_category: 'hotel_enquiry',
        });
        setDone(true);
        return;
      }
      setError(result.error);
      // Turnstile tokens are single-use — force a fresh challenge.
      setCaptchaToken('');
      setCaptchaReset((n) => n + 1);
    });
  }

  if (done) {
    const waHref = buildHotelWhatsAppLink({
      number: toWhatsAppNumber(footerContact.supportPhone),
      hotelName,
      city,
      slug: hotelSlug,
      campaign: source,
      checkin: checkIn || null,
      checkout: checkOut || null,
      guests,
    });
    return (
      <div
        className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center"
        role="status"
      >
        <CheckCircle2 className="mx-auto text-green-600" size={32} aria-hidden />
        <p className="mt-3 font-heading text-[16px] font-semibold text-deep">
          Thank you, {name.trim().split(' ')[0]}!
        </p>
        <p className="mt-1 text-[13px] text-ink/65">
          Aapki enquiry mil gayi hai. Hum jaldi aapko call ya WhatsApp par sampark karenge.
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring mt-4 inline-flex items-center justify-center rounded-xl bg-[#25D366] px-5 py-2.5 font-heading text-[13px] font-semibold text-white transition active:scale-[0.98]"
        >
          Faster reply? Chat on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-deep/15 bg-white p-5"
      noValidate
    >
      <div>
        <h2 className="font-heading text-[16px] font-semibold text-deep">{title}</h2>
        <p className="mt-1 text-[12.5px] text-ink/60">{subtitle}</p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="inq-name" className={LABEL}>
          Your name
        </label>
        <input
          id="inq-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="inq-phone" className={LABEL}>
          Mobile number
        </label>
        <input
          id="inq-phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          placeholder="10-digit mobile number"
          maxLength={16}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="inq-in" className={LABEL}>
            Check-in
          </label>
          <input
            id="inq-in"
            name="checkIn"
            type="date"
            min={minDate}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="inq-out" className={LABEL}>
            Check-out
          </label>
          <input
            id="inq-out"
            name="checkOut"
            type="date"
            min={checkIn || minDate}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="inq-guests" className={LABEL}>
          Guests
        </label>
        <select
          id="inq-guests"
          name="guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className={FIELD}
        >
          {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
            <option key={n} value={n}>
              {n} {n === '1' ? 'guest' : 'guests'}
            </option>
          ))}
        </select>
      </div>

      {/* Honeypot — hidden from people, bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="inq-website">Website</label>
        <input
          id="inq-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />

      <button
        type="submit"
        disabled={pending}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-deep py-3 font-heading text-[14px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.99] disabled:opacity-60"
      >
        <Send size={16} aria-hidden />
        {pending ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
