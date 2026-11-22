import { Skeleton, SkeletonRegion } from "@/components/skeleton";

// Skeleton der Seite "Ideen teilen / Geteilte Links" - gleicher Aufbau wie
// die echte Seite (Titel, Formular-Karte, Linkliste).
export default function ShareLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 2xl:max-w-3xl">
      <SkeletonRegion className="flex flex-col gap-6">
        <Skeleton className="skeleton-round h-7 w-44" />
        <Skeleton className="h-8 w-40" />

        <div className="surface flex flex-col gap-3 rounded-2xl p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="skeleton-round h-11 w-44" />
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-36" />
          {[0, 1].map((row) => (
            <div key={row} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </SkeletonRegion>
    </main>
  );
}
