// ROOT PATH: src/app/hotels/[slug]/book/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getHotelBySlug } from '@/app/actions/hotel.actions';
import { getBookableRoomsForHotel } from '@/app/actions/room-type.actions';
import { getAuthUser } from '@/lib/auth/session';
import BookingForm from '@/components/booking/BookingForm';
import HotelInquiryForm from '@/components/public/HotelInquiryForm';

// BOOKING-01 — /hotels/* is in middleware.ts's public allowlist (AUTH-06,
// frozen).
//
// GOLIVE-06 (D1 = Option A): ONLINE booking/payment still requires login.
// PILOT-01: a visitor who is not signed in is NO LONGER bounced to /login —
// they get the no-login enquiry form (room/dates prefilled) so ad traffic is
// never lost at a login wall. A "Log in to book & pay online" link stays
// available for people who want the instant-booking flow.

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

  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    notFound();
  }

  // ROOM-05: rooms + rates for this hotel, so a room can actually be
  // selected and its price captured on the booking (previously this
  // page only ever knew about hotel.starting_price).
  const rooms = await getBookableRoomsForHotel(hotel.id);

  if (!authUser) {
    const back = new URLSearchParams();
    if (preselectedRoomId) back.set('room', preselectedRoomId);
    if (initialCheckIn) back.set('checkin', initialCheckIn);
    if (initialCheckOut) back.set('checkout', initialCheckOut);
    if (initialGuests) back.set('guests', initialGuests);
    const query = back.toString();
    const loginTarget = `/hotels/${slug}/book${query ? `?${query}` : ''}`;
    const chosenRoom = preselectedRoomId
      ? rooms.find((r) => r.id === preselectedRoomId)
      : undefined;

    return (
      <main className="bg-cream">
        <Navbar />

        <section className="mx-auto max-w-xl px-5 py-10 sm:px-6">
          <h1 className="font-display text-[26px] leading-tight text-deep">
            Book {hotel.hotel_name}
          </h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Share your details and our team will confirm availability and the
            best rate with you. No login needed.
            {chosenRoom ? ` Selected room: ${chosenRoom.room_name}.` : ''}
          </p>

          <div className="mt-6">
            <HotelInquiryForm
              hotelId={hotel.id}
              hotelName={hotel.hotel_name}
              hotelSlug={slug}
              city={hotel.city}
              defaultCheckIn={initialCheckIn}
              defaultCheckOut={initialCheckOut}
              defaultGuests={initialGuests}
              roomTypeId={chosenRoom?.id ?? null}
              title="Request this booking"
              subtitle="We will call or WhatsApp you shortly to confirm."
            />
          </div>

          <p className="mt-5 text-center text-[13px] text-ink/60">
            Want to pay online right now?{' '}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(loginTarget)}`}
              className="focus-ring font-semibold text-deep underline"
            >
              Log in to book and pay online
            </Link>
          </p>
        </section>

        <Footer />
      </main>
    );
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
