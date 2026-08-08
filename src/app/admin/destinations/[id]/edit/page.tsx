import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestinationByIdAdmin } from "@/app/actions/destination.actions";
import { DestinationForm } from "@/components/admin/destinations/DestinationForm";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const destination = await getDestinationByIdAdmin(id);

  if (!destination) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-deep">Edit Destination</h1>
        <Link
          href={`/admin/destinations/${destination.id}/images`}
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Manage Images
        </Link>
      </div>
      <DestinationForm mode="edit" destination={destination} />
    </div>
  );
}
