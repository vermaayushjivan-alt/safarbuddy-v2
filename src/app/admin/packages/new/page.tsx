import { PackageForm } from "@/components/admin/packages/PackageForm";

export default function NewPackagePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Package</h1>
      <PackageForm mode="create" />
    </div>
  );
}
