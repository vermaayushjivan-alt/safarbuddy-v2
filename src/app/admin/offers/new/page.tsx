import OfferForm from "@/components/admin/offers/OfferForm";

export default function NewOfferPage() {
  return (
    <main className="p-6">
      <OfferForm mode="create" />
    </main>
  );
}
