import { notFound } from "next/navigation";
import PromotionForm from "@/components/admin/promotions/PromotionForm";
import { getPromotionByIdAdmin } from "@/app/actions/promotion.actions";

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promotion = await getPromotionByIdAdmin(id);

  if (!promotion) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Edit Promotion</h1>
      <PromotionForm mode="edit" promotion={promotion} />
    </div>
  );
}

