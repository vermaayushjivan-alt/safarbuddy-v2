import { OfferForm } from "@/components/admin/offers/OfferForm";

export default function NewOfferPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Offer</h1>
      <OfferForm mode="create" />
    </div>
  );
}
