// Next.js umschliesst page.tsx automatisch mit dieser Datei in einem
// Suspense-Boundary - zeigt sofort ein Skeleton waehrend die
// Supabase-Abfragen auf der Personenseite laufen, statt dass der Klick auf
// eine Person ohne jedes Feedback 2-3 Sekunden "haengt" (Issue #169).
// Header/Nav/Footer kommen aus dem Dashboard-Layout (liegt ausserhalb
// dieses Suspense-Boundary) und werden hier bewusst NICHT mehr
// dupliziert - sie bleiben waehrend des Ladens stehen.
export default function PersonPageLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 animate-pulse flex-col gap-6 px-4 py-10 2xl:max-w-3xl">
      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />

      <div className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
        <div className="h-6 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <div className="rounded-2xl border-2 border-neutral-200 p-4 dark:border-neutral-800">
        <div className="h-5 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-3 h-9 w-full rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-5 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-12 w-full rounded-md bg-neutral-100 dark:bg-neutral-900" />
        <div className="h-12 w-full rounded-md bg-neutral-100 dark:bg-neutral-900" />
        <div className="h-12 w-full rounded-md bg-neutral-100 dark:bg-neutral-900" />
      </div>
    </main>
  );
}
