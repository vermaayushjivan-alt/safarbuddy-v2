import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getHotelBySlug } from '@/app/actions/hotel.actions';
import { getAuthUser } from '@/lib/auth/session';
import BookingForm from '@/components/booking/BookingForm';

// BOOKING-01 — /hotels/* is in middleware.ts's public allowlist (AUTH-06,
// frozen), so this page guards authentication itself rather than
// modifying that frozen middleware rule.

export default async function HotelBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const authUser = await getAuthUser();
  if (!authUser) {
    redirect(`/login?redirectTo=/hotels/${slug}/book`);
  }

  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    notFound();
  }

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl text-deep">Book {hotel.hotel_name}</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          Confirm your stay details below. No payment is required at this step.
        </p>

        <div className="mt-8">
          <BookingForm
            mode="hotel"
            targetId={hotel.id}
            targetName={hotel.hotel_name}
            startingPrice={hotel.starting_price}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
