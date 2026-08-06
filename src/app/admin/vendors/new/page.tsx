import { VendorForm } from "@/components/admin/vendors/VendorForm";

export default function NewVendorPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Vendor</h1>
      <VendorForm mode="create" />
    </div>
  );
}
