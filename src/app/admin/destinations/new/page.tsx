import { DestinationForm } from "@/components/admin/destinations/DestinationForm";

export default function NewDestinationPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Destination</h1>
      <DestinationForm mode="create" />
    </div>
  );
}
