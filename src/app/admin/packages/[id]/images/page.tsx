import { notFound } from "next/navigation";
import { getPackageByIdAdmin } from "@/app/actions/package.actions";
import { PackageImageManager } from "@/components/admin/packages/PackageImageManager";

export default async function PackageImagesPage({
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
      <h1 className="mb-2 font-display text-3xl text-deep">
        {pkg.package_name} — Images
      </h1>
      <p className="mb-8 text-[14px] text-ink/60">
        Manage photos for this package.
      </p>
      <PackageImageManager packageId={pkg.id} />
    </div>
  );
}
