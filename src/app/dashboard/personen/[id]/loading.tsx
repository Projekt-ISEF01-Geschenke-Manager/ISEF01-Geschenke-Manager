import {
  Skeleton,
  SkeletonGiftItem,
  SkeletonRegion,
} from "@/components/skeleton";

// Next.js umschliesst page.tsx automatisch mit dieser Datei in einem
// Suspense-Boundary - zeigt sofort ein Skeleton waehrend die
// Supabase-Abfragen auf der Personenseite laufen (Issue #169). Aufbau und
// Breite 1:1 wie die echte Seite: Zurueck-Button, Personenkarte mit
// Aktions-Buttons, darunter zweispaltig die Ideen-Karte und rechts
// "Fruehere Geschenke" + "Vorschlaege". Header/Nav/Footer kommen aus dem
// Dashboard-Layout und bleiben stehen.
export default function PersonPageLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
      <SkeletonRegion className="flex flex-col gap-7">
        <Skeleton className="skeleton-round h-7 w-44" />

        <div className="surface flex flex-wrap items-start justify-between gap-4 rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="skeleton-round h-[84px] w-[84px] shrink-0" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="skeleton-round h-6 w-16" />
                <Skeleton className="skeleton-round h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="skeleton-round h-11 w-[130px]" />
            <Skeleton className="skeleton-round h-11 w-[130px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="surface flex flex-col gap-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="skeleton-round h-11 w-44" />
            </div>
            <SkeletonGiftItem />
            <SkeletonGiftItem />
            <SkeletonGiftItem />
          </div>

          <div className="flex flex-col gap-6">
            <div className="surface flex flex-col gap-4 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="skeleton-round h-11 w-36" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-input-border p-6">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </SkeletonRegion>
    </main>
  );
}
