import Link from "next/link";

// Navigation unter dem Header - Werte 1:1 aus der Referenz-Mockup-Datei
// (Uebersicht.dc.html) uebernommen: keine eigene Hintergrundfarbe (der
// Verlauf des Inhaltsbereichs darunter laeuft durch), nur eine Trennlinie.
// "Gesamtliste" ist Teil der Spezifikation, existiert aber noch nicht als
// eigene Route - bewusst als nicht-klickbarer Platzhalter (optisch
// identisch zum inaktiven Tab) statt auf eine 404-Seite zu verlinken.
export function DashboardNav({ active }: { active: "uebersicht" | "geteilte-links" }) {
  return (
    <nav aria-label="Hauptnavigation" className="border-b border-rule">
      <div className="mx-auto flex max-w-[1140px] flex-wrap gap-x-8 gap-y-2 px-6">
        <Link href="/dashboard" className={navLinkClass(active === "uebersicht")}>
          Übersicht
        </Link>
        <span className="cursor-not-allowed border-b-[3px] border-transparent pt-4 pb-[13px] text-[15px] text-muted">
          Gesamtliste
        </span>
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
  const base = "border-b-[3px] pt-4 pb-[13px] text-[15px] transition";
  return isActive
    ? `${base} border-accent font-semibold text-heading`
    : `${base} border-transparent text-muted hover:opacity-85`;
}
