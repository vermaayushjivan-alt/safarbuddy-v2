import Link from "next/link";
import Image from "next/image";

interface Destination {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  primary_image_url?: string | null;
  location?: string | null;
}

export function DestinationGrid({
  destinations,
}: {
  destinations: Destination[];
}) {
  if (!destinations || destinations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No destinations available right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {destinations.map((item) => (
        <Link
          key={item.id}
          href={`/destinations/${item.slug}`}
          className="group border rounded-xl overflow-hidden hover:shadow-md transition bg-card"
        >
          <div className="relative aspect-video w-full bg-muted">
            {item.primary_image_url ? (
              <Image
                src={item.primary_image_url}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No image
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition">
              {item.name}
            </h3>
            {item.location && (
              <p className="text-xs text-muted-foreground">{item.location}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
