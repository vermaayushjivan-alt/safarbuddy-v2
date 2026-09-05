import Link from "next/link";
import { getMyHotel } from "@/app/actions/owner-hotel.actions";
import { OwnerHotelForm } from "@/components/owner/OwnerHotelForm";
import { toSafeErrorMessage } from "@/lib/actions/action-result";

// P0.3 Steps 2 & 5 (2026-09-05 session — see SESSION_HANDOFF.md).
//
// This is the first real page /hotel-owner has ever had — the layout
// (requireRole gate) already existed from Step 1, but nothing rendered
// inside it. Scope decision (documented here since the milestone's own
// docs never pinned down what "onboarding wizard page" means beyond the
// name — Bible Rule 12, stating the assumption rather than guessing
// silently):
//
// - hotels.status === 'pending' (the only state a fresh VENDOR-03
//   self-service submission can be in): show a read-only
//   "submitted for review" screen. Nothing to edit yet from the
//   owner's side — an admin hasn't approved the listing, so letting
//   them keep changing it here adds review-drift risk for no real
//   benefit at this stage.
// - Any other status ('active' | 'inactive' | 'suspended'): show the
//   property management form (OwnerHotelForm, backed by the already-
//   complete updateMyHotel() from Step 1). This doubles as the
//   "onboarding wizard page" — there is only one hotel per vendor
//   (see getMyHotel()'s own doc comment), so there is nothing to
//   navigate between; a single status-aware page covers both.
//
// Not handled here (out of scope for this milestone, unchanged):
// admin's approval queue action itself, multi-property support, room
// management UI (owner-room-type/-image actions exist but have no
// page yet — a separate milestone).
export default async function HotelOwnerDashboardPage() {
  let hotel;

  try {
    hotel = await getMyHotel();
  } catch (err) {
    // requireOwnerVendor() can throw NO_VENDOR_FOR_OWNER here even
    // though the layout's requireRole() already passed — this route
    // also allows admin/super_admin (matching every other owner-area
    // guard), and an admin visiting /hotel-owner has no vendor row at
    // all. Surfaced as a message rather than an uncaught render error.
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>{toSafeErrorMessage(err)}</Alert>
      </div>
    );
  }

  if (!hotel) {
    // Should not happen in normal use for a real hotel_owner account —
    // submitPropertyListing() always creates the hotel before granting
    // the role — but an admin/super_admin with no vendor/hotel of
    // their own can still reach this page, so this is handled rather
    // than assumed impossible.
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
    return <SubmittedForReviewScreen hotelName={hotel.hotel_name} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep">Your Property</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          Manage the details guests and our booking team see for{" "}
          {hotel.hotel_name}.
        </p>
      </div>

      {hotel.status !== "active" && (
        <div className="mb-6">
          <Alert>
            {hotel.status === "inactive"
              ? "This property is currently inactive and is not visible to guests. Contact support if you believe this is a mistake."
              : "This property has been suspended and is not visible to guests. Contact support for details."}
          </Alert>
        </div>
      )}

      <OwnerHotelForm hotel={hotel} />
    </div>
  );
}

function SubmittedForReviewScreen({ hotelName }: { hotelName: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-mist text-deep">
        <ClockIcon />
      </div>
      <h1 className="mt-6 font-display text-2xl text-deep">
        {hotelName} is submitted for review
      </h1>
      <p className="mt-3 max-w-md text-[14px] text-ink/60">
        Our team reviews every new listing before it goes live. We&apos;ll
        notify you by email as soon as {hotelName} is approved and visible to
        guests — there&apos;s nothing more you need to do right now.
      </p>
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

function ClockIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

