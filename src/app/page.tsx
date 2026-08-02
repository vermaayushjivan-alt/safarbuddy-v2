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
export default function Home() {
  return (
    <main className="bg-cream">
      <Navbar />
      <Hero />
      <Offers />
      <Destinations />
      <Trending />
      <TrendingFlights />
      <Packages />
      <Testimonials />
      <AppDownload />
      <Footer />
    </main>
  );
}
