import Link from "next/link";
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-deep">Edit Package</h1>
        <Link
          href={`/admin/packages/${pkg.id}/images`}
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Manage Images
        </Link>
      </div>
      <PackageForm mode="edit" pkg={pkg} />
    </div>
  );
}
