import { HotelForm } from "@/components/admin/hotels/HotelForm";

export default function NewHotelPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl text-deep">Add Hotel</h1>
      <HotelForm mode="create" />
    </div>
  );
}
