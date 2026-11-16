import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardNav } from "@/components/dashboard-nav";

// Siehe src/app/dashboard/personen/[id]/loading.tsx - gleiches Prinzip
// fuer die Uebersicht selbst (Issue #169).
export default function DashboardLoading() {
  return (
    <>
      <SiteHeader />
      <DashboardNav active="uebersicht" />
      <div
        className="flex flex-1 flex-col"
        style={{
          background: "linear-gradient(180deg, var(--bg-fade-top) 0px, var(--bg) 260px)",
        }}
      >
        <main className="mx-auto flex w-full max-w-[1140px] flex-1 animate-pulse flex-col gap-7 px-6 pt-8 pb-14">
          <div className="h-9 w-56 rounded bg-neutral-200 dark:bg-neutral-800" />

          <div className="flex flex-wrap items-start gap-6">
            <div className="h-48 min-w-0 flex-1 basis-[320px] rounded-2xl bg-neutral-200 max-lg:max-w-full lg:max-w-[380px] dark:bg-neutral-800" />
            <div className="h-48 min-w-0 flex-[999] basis-[560px] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
