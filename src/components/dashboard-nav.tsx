import Link from "next/link";

// Zweite Leiste direkt unter dem Header (Wireframe "Übersicht"). Nur
// "Übersicht" und "Geteilte Links" sind echte Routen - "Gesamtliste" aus
// dem Wireframe existiert noch nicht als eigene Seite und wird hier bewusst
// weggelassen statt auf eine 404-Route zu verlinken.
export function DashboardNav({ active }: { active: "uebersicht" | "geteilte-links" }) {
  return (
    <nav className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-5xl gap-6 px-4">
        <Link href="/dashboard" className={navLinkClass(active === "uebersicht")}>
          Übersicht
        </Link>
        <Link
          href="/dashboard/teilen"
          className={navLinkClass(active === "geteilte-links")}
        >
          Geteilte Links
        </Link>
      </div>
    </nav>
  );
}

function navLinkClass(isActive: boolean) {
  const base = "border-b-2 px-1 py-4 text-sm font-medium transition";
  return isActive
    ? `${base} border-neutral-900 text-neutral-900 dark:border-white dark:text-white`
    : `${base} border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white`;
}
