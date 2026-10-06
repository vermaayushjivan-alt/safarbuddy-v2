// ROOT PATH: src/app/admin/offers/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import OfferForm from "@/components/admin/offers/OfferForm";
import {
  getOfferByIdAdmin,
  getOfferHotelIdsAdmin,
  getHotelOptionsAdmin,
} from "@/app/actions/offer.actions";

// LAUNCH-06 — admin "Edit offer" page. The Edit button in /admin/offers
// links here. This file had been overwritten with the PUBLIC offer detail
// page (hotels + booking cards), so every Edit click landed on a booking
// page instead of the form. Auth is enforced by src/app/admin/layout.tsx.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const offer = await getOfferByIdAdmin(id);
  if (!offer) notFound();

  const [hotelOptions, initialHotelIds] = await Promise.all([
    getHotelOptionsAdmin(),
    getOfferHotelIdsAdmin(id),
  ]);

  return (
    <main className="p-6">
      <OfferForm
        mode="edit"
        offer={offer}
        hotelOptions={hotelOptions}
        initialHotelIds={initialHotelIds}
      />
    </main>
  );
}
