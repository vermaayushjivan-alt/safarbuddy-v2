
import { notFound } from "next/navigation";
import { getVendorByIdAdmin } from "@/app/actions/vendor.actions";
import { VendorPayoutForm } from "@/components/admin/vendors/VendorPayoutForm";

export default async function VendorPayoutPage({
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
        {vendor.vendor_name} — Payout Details
      </h1>
      <p className="mb-8 text-[14px] text-ink/60">
        Bank/UPI details used for automated split settlement (PAY-04, not yet
        live).
      </p>
      <VendorPayoutForm vendorId={vendor.id} />
    </div>
  );
}
