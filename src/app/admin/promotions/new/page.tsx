import PromotionForm from "@/components/admin/promotions/PromotionForm";

export default function NewPromotionPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Promotion</h1>
      <PromotionForm mode="create" />
    </div>
  );
}

