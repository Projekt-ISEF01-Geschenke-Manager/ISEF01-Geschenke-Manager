import { Skeleton, SkeletonRegion } from "@/components/skeleton";

// Skeleton der Seite "Geteilte Links" - gleicher Aufbau und gleiche Breite
// wie die echte Seite: Zurueck-Button, Titel, links die Erstellen-Karte,
// rechts die Link-Karten.
export default function ShareLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
      <SkeletonRegion className="flex flex-col gap-7">
        <Skeleton className="skeleton-round h-7 w-44" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <div className="surface flex min-w-0 flex-1 basis-[320px] flex-col gap-4 rounded-2xl p-6 max-lg:max-w-full lg:max-w-[380px]">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-52" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="skeleton-round h-8 w-24" />
              <Skeleton className="skeleton-round h-8 w-28" />
            </div>
            <Skeleton className="skeleton-round h-9 w-36" />
          </div>

          <div className="flex min-w-0 flex-[999] basis-[560px] flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="surface flex items-center gap-4 rounded-2xl p-4">
                <Skeleton className="skeleton-round h-12 w-12 shrink-0" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="skeleton-round h-7 w-28" />
                <Skeleton className="skeleton-round h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
      </SkeletonRegion>
    </main>
  );
}
