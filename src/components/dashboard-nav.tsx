"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Liefert nur die Tabs selbst (keine eigene Flaeche/Hintergrund mehr) -
// lebt als nav-Slot direkt in der Header-Zeile (SiteHeader) im
// Dashboard-Layout, nicht mehr als eigener Balken darunter und nicht mehr
// pro Seite einzeln eingebunden. Ermittelt den aktiven Tab selbst ueber
// usePathname(), statt einen active-Prop von jeder einzelnen Seite zu
// verlangen - sonst vergisst eine Seite (wie zuvor /dashboard/teilen) das
// leicht, und die Navigation wirkt dort inkonsistent oder fehlt ganz.
// Pillenform statt Unterstreichung, weil eine Linie auf dem Farbverlauf
// des Headers kaum auffaellt; die aktive Pille ist dunkel getoent statt
// hell, damit sie unabhaengig davon, ob sie gerade auf dem hellen oder
// dunklen Teil des Verlaufs sitzt, immer gut lesbar bleibt. Inaktive Tabs
// bekommen stattdessen einen Schlagschatten hinter dem Text.
// "Gesamtliste" ist Teil der Spezifikation, existiert aber noch nicht als
// eigene Route - bewusst als nicht-klickbarer Platzhalter (optisch
// identisch zum inaktiven Tab) statt auf eine 404-Seite zu verlinken.
export function DashboardNav() {
  const pathname = usePathname();
  const isUebersicht = pathname === "/dashboard";
  const isGeteilteLinks = pathname.startsWith("/dashboard/teilen");

  return (
    <nav
      aria-label="Hauptnavigation"
      className="order-last flex w-full flex-wrap gap-1 sm:order-none sm:w-auto sm:justify-center"
    >
      <Link href="/dashboard" className={tabClass(isUebersicht)}>
        Übersicht
      </Link>
      <span className="cursor-not-allowed rounded-full px-4 py-2 text-sm whitespace-nowrap text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
        Gesamtliste
      </span>
      <Link href="/dashboard/teilen" className={tabClass(isGeteilteLinks)}>
        Geteilte Links
      </Link>
    </nav>
  );
}

function tabClass(isActive: boolean) {
  const base = "rounded-full px-4 py-2 text-sm whitespace-nowrap transition";
  return isActive
    ? `${base} bg-black/20 font-semibold text-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]`
    : `${base} text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] hover:bg-black/10`;
}
