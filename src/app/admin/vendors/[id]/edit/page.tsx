import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorByIdAdmin } from "@/app/actions/vendor.actions";
import { VendorForm } from "@/components/admin/vendors/VendorForm";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await getVendorByIdAdmin(id);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl text-deep">Edit Vendor</h1>
        <Link
          href={`/admin/vendors/${vendor.id}/branches`}
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Manage Branches
        </Link>
      </div>
      <VendorForm mode="edit" vendor={vendor} />
    </div>
  );
}
