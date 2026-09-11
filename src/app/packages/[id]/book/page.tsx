import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getPackageForBooking } from '@/app/actions/package.actions';
import { getAuthUser } from '@/lib/auth/session';
import { isValidUuid } from '@/lib/utils/uuid';
import BookingForm from '@/components/booking/BookingForm';

// BOOKING-01 — no public /packages/[slug] listing/detail page exists yet
// (only /admin/packages is built so far), so this route is addressed by
// id.
//
// BOOKING-03: this page (and /packages/[id] generally) used to be
// outside middleware.ts's public allowlist, and this page additionally
// redirected to /login itself — both blocked guest checkout entirely
// for packages. middleware.ts now allows the /packages/ prefix; the
// redirect here is removed the same way it was for the hotel booking
// page, and authUser is kept only to tell BookingForm whether to show
// the guest-contact section.

export default async function PackageBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const authUser = await getAuthUser();

  const pkg = await getPackageForBooking(id);
  if (!pkg) {
    notFound();
  }

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl text-deep">Book {pkg.package_name}</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          Confirm your travel details below. No payment is required at this step.
        </p>

        <div className="mt-8">
          <BookingForm
            mode="package"
            targetId={pkg.id}
            targetName={pkg.package_name}
            startingPrice={pkg.starting_price}
            isAuthenticated={Boolean(authUser)}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
