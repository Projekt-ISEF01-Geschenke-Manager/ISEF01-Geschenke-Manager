// Bausteine fuer die Lade-Skeletons (loading.tsx). Gleiche Karten-Optik wie
// die echten Seiten (surface), Platzhalter mit Lichtschimmer (.skeleton in
// globals.css). Container melden sich als "wird geladen" fuer Screenreader.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function SkeletonRegion({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={`skeleton-fade ${className}`}>
      <span className="sr-only">Lädt …</span>
      {children}
    </div>
  );
}

export function SkeletonPersonCard() {
  return (
    <div className="surface flex items-center gap-3 rounded-2xl p-4">
      <Skeleton className="skeleton-round h-12 w-12 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-1.5">
          <Skeleton className="skeleton-round h-5 w-14" />
          <Skeleton className="skeleton-round h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGiftItem() {
  return (
    <div className="surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:justify-between">
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="skeleton-round h-5 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="skeleton-round h-7 w-28" />
        <Skeleton className="skeleton-round h-7 w-20" />
        <Skeleton className="skeleton-round h-7 w-16" />
      </div>
    </div>
  );
}
