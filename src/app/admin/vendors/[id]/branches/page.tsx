import { notFound } from "next/navigation";
import { getVendorByIdAdmin } from "@/app/actions/vendor.actions";
import { VendorBranchManager } from "@/components/admin/vendors/VendorBranchManager";

export default async function VendorBranchesPage({
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
      <h1 className="mb-2 font-display text-3xl text-deep">
        {vendor.vendor_name} — Branches
      </h1>
      <p className="mb-8 text-[14px] text-ink/60">
        Manage branch locations for this vendor.
      </p>
      <VendorBranchManager vendorId={vendor.id} />
    </div>
  );
}
