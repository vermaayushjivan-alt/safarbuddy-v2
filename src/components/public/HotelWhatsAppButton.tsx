// ROOT PATH: src/components/public/HotelWhatsAppButton.tsx
// "Chat on WhatsApp" for hotel detail pages. Plain <a> — no client JS needed.
// Opens WhatsApp with a prefilled message naming the hotel.
import { MessageCircle } from "lucide-react";

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
