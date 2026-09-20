import OfferForm from "@/components/admin/offers/OfferForm";
import { getHotelOptionsAdmin } from "@/app/actions/offer.actions";

export default async function NewOfferPage() {
  const hotelOptions = await getHotelOptionsAdmin();

  return (
    <main className="p-6">
      <OfferForm mode="create" hotelOptions={hotelOptions} />
    </main>
  );
}

