// ROOT PATH: src/components/public/HotelWhatsAppButton.tsx
// WhatsApp CTA + link helpers for hotel detail pages. Plain <a> — no client JS.
import { MessageCircle } from "lucide-react";

// ---- Link helpers (kept in this file on purpose: one file to deploy) ----

/** "+91 73074 93338" -> "917307493338" (wa.me wants digits only, with country code). */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  // 10-digit Indian mobile without country code -> prefix 91.
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Ad-campaign tag that travels inside the WhatsApp message, so the person
 * answering knows which hotel/ad the chat came from. Keeps only
 * [a-z0-9_-] and caps the length — it is user-controlled input.
 */
export function sanitizeRef(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 40);
}

export type HotelWhatsAppInput = {
  /** Digits-only number with country code (see toWhatsAppNumber). */
  number: string;
  hotelName: string;
  city?: string | null;
  /** Canonical hotel slug — always included as the reference. */
  slug: string;
  /** Optional ad tag, e.g. utm_campaign. Sanitised here. */
  campaign?: string | null;
  checkin?: string | null;
  checkout?: string | null;
  guests?: string | null;
};

export function buildHotelWhatsAppMessage(input: HotelWhatsAppInput): string {
  const where = input.city ? `${input.hotelName}, ${input.city}` : input.hotelName;
  const lines = [`Hi ChalFirr, mujhe ${where} ke baare mein poochna hai.`];

  const stay: string[] = [];
  if (input.checkin && input.checkout) {
    stay.push(`Dates: ${input.checkin} to ${input.checkout}`);
  }
  if (input.guests) stay.push(`Guests: ${input.guests}`);
  if (stay.length > 0) lines.push(stay.join(", "));

  const campaign = sanitizeRef(input.campaign);
  const slug = sanitizeRef(input.slug);
  lines.push(`Ref: ${campaign ? `${slug}/${campaign}` : slug}`);

  return lines.join("\n");
}

export function buildHotelWhatsAppLink(input: HotelWhatsAppInput): string {
  const text = buildHotelWhatsAppMessage(input);
  return `https://wa.me/${input.number}?text=${encodeURIComponent(text)}`;
}

// ---- Button ----

type Props = {
  href: string;
  /** "icon" = round button for the mobile sticky bar; "full" = wide button for the desktop card. */
  variant: "icon" | "full";
};

export default function HotelWhatsAppButton({ href, variant }: Props) {
  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-md transition active:scale-95"
      >
        <MessageCircle size={20} aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-white py-2.5 text-center font-heading text-[13px] font-semibold text-[#128C7E] transition hover:bg-[#25D366]/10"
    >
      <MessageCircle size={16} aria-hidden />
      Chat on WhatsApp
    </a>
  );
}
