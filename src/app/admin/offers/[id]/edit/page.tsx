import { notFound } from "next/navigation";
import { getOfferByIdAdmin } from "@/app/actions/offer.actions";
import { OfferForm } from "@/components/admin/offers/OfferForm";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer = await getOfferByIdAdmin(id);

  if (!offer) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-deep">Edit Offer</h1>
      </div>
      <OfferForm mode="edit" offer={offer} />
    </div>
  );
}
