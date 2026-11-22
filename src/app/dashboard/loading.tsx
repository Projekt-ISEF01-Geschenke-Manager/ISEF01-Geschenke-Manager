import { SkeletonRegion, Skeleton, SkeletonPersonCard } from "@/components/skeleton";

// Skeleton der Uebersicht (Issue #169): gleicher Aufbau wie die echte Seite
// (Titel, Anlaesse-Karte, Personenkarten), Header/Nav/Footer kommen aus dem
// Dashboard-Layout und bleiben waehrend des Ladens stehen.
export default function DashboardLoading() {
  return (
    <div
      className="flex flex-1 flex-col"
      style={{
        background: "linear-gradient(180deg, var(--bg-fade-top) 0px, var(--bg) 260px)",
      }}
    >
      <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
        <SkeletonRegion className="flex flex-col gap-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-9 w-56" />
            <div className="flex gap-3">
              <Skeleton className="skeleton-round h-11 w-36" />
              <Skeleton className="skeleton-round h-11 w-36" />
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <div className="surface flex min-w-0 flex-1 basis-[320px] flex-col gap-4 rounded-2xl p-6 max-lg:max-w-full lg:max-w-[380px]">
              <Skeleton className="h-6 w-40" />
              {[0, 1].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-[52px] w-[52px] shrink-0" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="skeleton-round h-6 w-14" />
                </div>
              ))}
              <Skeleton className="h-2 w-full" />
            </div>

            <div className="flex min-w-0 flex-[999] basis-[560px] flex-col gap-4">
              <Skeleton className="h-6 w-44" />
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                <SkeletonPersonCard />
                <SkeletonPersonCard />
                <SkeletonPersonCard />
              </div>
            </div>
          </div>
        </SkeletonRegion>
      </main>
    </div>
  );
}
