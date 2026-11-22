import { requireUser } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardNav } from "@/components/dashboard-nav";

// Rendert Header+Nav und Footer zentral fuer die gesamte /dashboard-
// Sektion, statt dass jede Unterseite sie einzeln einbindet (frueher
// vergass z. B. /dashboard/teilen die Navigation komplett). Layouts
// liegen ausserhalb des Suspense-Boundary, das loading.tsx fuer das
// jeweilige page.tsx aufspannt (siehe Next.js-Doku zu loading.js: wrapt
// page.js, aber nicht das layout.js im selben Segment) - Header/Nav/Footer
// bleiben dadurch bei jeder Navigation innerhalb von /dashboard fest
// stehen und verschwinden/verschieben sich nicht waehrend die jeweilige
// Unterseite laedt.
// Daneben weiterhin der Grund, warum diese Datei ueberhaupt existiert:
// revalidatePath(path, "layout") in den Server Actions deckt dadurch
// sowohl /dashboard als auch verschachtelte Routen wie
// /dashboard/personen/[id] ab, ohne jede ID einzeln nachschlagen zu
// muessen.
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user } = await requireUser();
  // Siehe dashboard/page.tsx (Git-Historie) fuer die urspruengliche
  // Herleitung dieser Logik - jetzt hier zentral statt pro Seite.
  const trimmedFullName = (user.user_metadata?.full_name as string | undefined)?.trim();
  const firstName = trimmedFullName
    ? trimmedFullName.split(/\s+/)[0]
    : user.email?.split("@")[0];

  return (
    <>
      <SiteHeader userName={firstName} nav={<DashboardNav />} />
      {children}
      <SiteFooter />
      {/* Platz fuer die feste Navigationsleiste am unteren Rand (nur Handy). */}
      <div aria-hidden="true" className="h-[calc(6rem+env(safe-area-inset-bottom))] sm:hidden" />
    </>
  );
}
