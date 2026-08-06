import { notFound } from "next/navigation";
import { getPackageByIdAdmin } from "@/app/actions/package.actions";
import { PackageForm } from "@/components/admin/packages/PackageForm";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackageByIdAdmin(id);

  if (!pkg) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Edit Package</h1>
      <PackageForm mode="edit" pkg={pkg} />
    </div>
  );
}
