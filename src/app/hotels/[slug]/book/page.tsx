// ROOT PATH: src/app/hotels/[slug]/book/page.tsx
import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getHotelBySlug } from '@/app/actions/hotel.actions';
import { getBookableRoomsForHotel } from '@/app/actions/room-type.actions';
import { getAuthUser } from '@/lib/auth/session';
import BookingForm from '@/components/booking/BookingForm';

// BOOKING-01 — /hotels/* is in middleware.ts's public allowlist (AUTH-06,
// frozen).
//
// GOLIVE-06 (D1 = Option A): booking requires login. A visitor who is not
// signed in is sent to /login and brought straight back here afterwards with
// the same room/dates (redirectTo carries the full path + query).

export default async function HotelBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    room?: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    room: preselectedRoomId,
    checkin: initialCheckIn,
    checkout: initialCheckOut,
    guests: initialGuests,
  } = await searchParams;

  const authUser = await getAuthUser();

  if (!authUser) {
    const back = new URLSearchParams();
    if (preselectedRoomId) back.set('room', preselectedRoomId);
    if (initialCheckIn) back.set('checkin', initialCheckIn);
    if (initialCheckOut) back.set('checkout', initialCheckOut);
    if (initialGuests) back.set('guests', initialGuests);
    const query = back.toString();
    const target = `/hotels/${slug}/book${query ? `?${query}` : ''}`;
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }

  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    notFound();
  }

  // ROOM-05: rooms + rates for this hotel, so a room can actually be
  // selected and its price captured on the booking (previously this
  // page only ever knew about hotel.starting_price).
  const rooms = await getBookableRoomsForHotel(hotel.id);

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
            rooms={rooms}
            preselectedRoomId={preselectedRoomId ?? null}
            initialCheckInDate={initialCheckIn ?? ""}
            initialCheckOutDate={initialCheckOut ?? ""}
            initialNumGuests={
              initialGuests ? Number(initialGuests) || 1 : 1
            }
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
