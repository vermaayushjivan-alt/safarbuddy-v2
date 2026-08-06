import { notFound } from "next/navigation";
import { getDestinationByIdAdmin } from "@/app/actions/destination.actions";
import { DestinationForm } from "@/components/admin/destinations/DestinationForm";

export default async function EditDestinationPage({
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
      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep">Edit Destination</h1>
      </div>
      <DestinationForm mode="edit" destination={destination} />
    </div>
  );
}
