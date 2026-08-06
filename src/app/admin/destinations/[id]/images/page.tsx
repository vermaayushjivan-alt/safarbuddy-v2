import { notFound } from "next/navigation";
import { getDestinationByIdAdmin } from "@/app/actions/destination.actions";
import { DestinationImageManager } from "@/components/admin/destinations/DestinationImageManager";

export default async function DestinationImagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const destination = await getDestinationByIdAdmin(id);

  if (!destination) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-2 font-display text-3xl text-deep">
        {destination.name} — Images
      </h1>
      <p className="mb-8 text-[14px] text-ink/60">
        Manage photos for this destination.
      </p>
      <DestinationImageManager destinationId={destination.id} />
    </div>
  );
}
