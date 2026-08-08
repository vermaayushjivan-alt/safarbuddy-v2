import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getPackageForBooking } from '@/app/actions/package.actions';
import { getAuthUser } from '@/lib/auth/session';
import { isValidUuid } from '@/lib/utils/uuid';
import BookingForm from '@/components/booking/BookingForm';

// BOOKING-01 — no public /packages/[slug] listing/detail page exists yet
// (only /admin/packages is built so far), so this route is addressed by
// id. Not in middleware.ts's public allowlist, so an unauthenticated
// request is already redirected to /login by middleware; the explicit
// check below keeps this page's behavior self-contained and consistent
// with the hotel booking page.

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
  if (!authUser) {
    redirect(`/login?redirectTo=/packages/${id}/book`);
  }

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
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
