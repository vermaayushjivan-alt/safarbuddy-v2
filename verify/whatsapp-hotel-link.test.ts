// ROOT PATH: verify/whatsapp-hotel-link.test.ts
import { describe, expect, it } from "vitest";
import {
  buildHotelWhatsAppLink,
  buildHotelWhatsAppMessage,
  sanitizeRef,
  toWhatsAppNumber,
} from "@/lib/whatsapp/hotel-link";

describe("toWhatsAppNumber", () => {
  it("strips spaces and plus", () => {
    expect(toWhatsAppNumber("+91 73074 93338")).toBe("917307493338");
    expect(toWhatsAppNumber("+91 7307493338")).toBe("917307493338");
  });
  it("adds 91 to a bare 10-digit mobile", () => {
    expect(toWhatsAppNumber("7307493338")).toBe("917307493338");
  });
});

describe("sanitizeRef", () => {
  it("keeps only safe characters and caps length", () => {
    expect(sanitizeRef("FB_Raghuvar-1 <script>")).toBe("fb_raghuvar-1script");
    expect(sanitizeRef("a".repeat(100))).toHaveLength(40);
    expect(sanitizeRef(undefined)).toBe("");
  });
});

describe("buildHotelWhatsAppMessage", () => {
  const base = { number: "917307493338", hotelName: "Hotel Raghuvar Residency", city: "Ayodhya", slug: "hotel-raghuvar-residency" };

  it("names the hotel, city and slug reference", () => {
    const msg = buildHotelWhatsAppMessage(base);
    expect(msg).toContain("Hotel Raghuvar Residency, Ayodhya");
    expect(msg).toContain("Ref: hotel-raghuvar-residency");
  });
  it("adds campaign and stay details when present", () => {
    const msg = buildHotelWhatsAppMessage({ ...base, campaign: "FB-Dec", checkin: "2026-12-10", checkout: "2026-12-12", guests: "2" });
    expect(msg).toContain("Dates: 2026-12-10 to 2026-12-12, Guests: 2");
    expect(msg).toContain("Ref: hotel-raghuvar-residency/fb-dec");
  });
  it("works without city", () => {
    expect(buildHotelWhatsAppMessage({ ...base, city: null })).toContain("mujhe Hotel Raghuvar Residency ke baare");
  });
});

describe("buildHotelWhatsAppLink", () => {
  it("builds an encoded wa.me link", () => {
    const link = buildHotelWhatsAppLink({ number: "917307493338", hotelName: "Hotel A & B", slug: "hotel-a-b" });
    expect(link.startsWith("https://wa.me/917307493338?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("Hotel A & B"));
    expect(link).not.toContain(" ");
  });
});
