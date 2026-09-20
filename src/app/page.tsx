import type { Metadata } from "next";
import Newsletter from "@/components/home/Newsletter";
import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Offers from "@/components/home/Offers";
import Destinations from "@/components/home/Destinations";
import Trending from "@/components/home/Trending";
import TrendingFlights from "@/components/home/TrendingFlights";
import Packages from "@/components/home/Packages";
import Testimonials from "@/components/home/Testimonials";
import AppDownload from "@/components/home/AppDownload";
import Footer from "@/components/home/Footer";
import HomeAiChatWidget from "@/components/home/HomeAiChatWidget";
import PromoBanner from "@/components/home/PromoBanner";

// SEO_AUDIT.md §4.3 — homepage had no dedicated metadata beyond the
// root layout default. Title/description intentionally match
// layout.tsx's site-wide copy (this IS the homepage) — the only
// addition is an explicit canonical, since "/" had none before.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="bg-cream">
      <Navbar />
      <Hero />
      <PromoBanner slot="after_hero" />
      <Offers />
      <Destinations />
      <PromoBanner slot="between_destinations_trending" />
      <Trending />
      <TrendingFlights />
      <Packages />
      <PromoBanner slot="between_packages_testimonials" />
      <Testimonials />
      <AppDownload />
      <Newsletter />
      <Footer />
      <HomeAiChatWidget />
    </main>
  );
}
