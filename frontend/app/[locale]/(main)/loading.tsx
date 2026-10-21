import { Skeleton } from "~/ui/primitives/skeleton";

/** Shown while a storefront page (the home page included) waits for its server data */
export default function MainLoading() {
  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8" aria-busy="true">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
