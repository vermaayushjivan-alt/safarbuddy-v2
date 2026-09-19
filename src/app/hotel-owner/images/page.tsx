import Link from "next/link";
import { getMyHotel } from "@/app/actions/owner-hotel.actions";
import { OwnerHotelImageManager } from "@/components/owner/OwnerHotelImageManager";
import { Alert } from "@/components/auth/Alert";
import { toSafeErrorMessage } from "@/lib/actions/action-result";

// Photo gallery audit fix (2026-09-19). Same shape/error-handling as
// hotel-owner/page.tsx (getMyHotel() can throw NO_VENDOR_FOR_OWNER for an
// admin/super_admin visiting an owner route with no vendor of their own —
// same reasoning documented there). Gated on hotel.status === 'pending'
// the same way OwnerHotelForm is: while a listing is awaiting review there
// is nothing else for the owner to change here either, so this route
// mirrors that same read-only-until-approved decision rather than
// introducing a second, inconsistent rule for images specifically.
export default async function HotelOwnerImagesPage() {
  let hotel;

  try {
    hotel = await getMyHotel();
  } catch (err) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>{toSafeErrorMessage(err)}</Alert>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>
          No property is linked to your account yet.{" "}
          <Link href="/list-your-property" className="font-medium underline">
            List a property
          </Link>{" "}
          to get started.
        </Alert>
      </div>
    );
  }

  if (hotel.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>
          {hotel.hotel_name} is still awaiting review. You&apos;ll be able to
          manage its photo gallery once it&apos;s approved.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <Link
          href="/hotel-owner"
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          ← Back to Your Property
        </Link>
      </div>

      <h1 className="mb-2 font-display text-3xl text-deep">
        {hotel.hotel_name} — Photo Gallery
      </h1>

      <p className="mb-8 text-[14px] text-ink/60">
        Manage the exterior, lobby, and property photos guests see on your
        listing.
      </p>

      <OwnerHotelImageManager hotelId={hotel.id} />
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-sky-light)]/30 bg-[var(--color-mist-2)] px-4 py-3 text-[13px] text-deep">
      {children}
    </div>
  );
}

