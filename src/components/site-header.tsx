import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { PalettePicker } from "./palette-picker";
import { signout } from "@/app/actions/auth";

// Gleiche Kopfzeile auf allen Seiten (Wireframe-Annotation "Allgemein").
// badge: zusaetzliche Kennzeichnung, z. B. "Geteilte Ansicht · nur lesen"
// auf der oeffentlichen Teilen-Route (A10) - ersetzt dort den Claim-Text.
// userName: nur auf eingeloggten Seiten gesetzt (Dashboard) - zeigt
// "Angemeldet als" + Abmelden-Button direkt im Header statt verstreut auf
// jeder Unterseite.
// nav: optionaler Slot fuer DashboardNav - frueher ein eigener Balken
// unter dem Header mit hartem Farbbruch, jetzt Teil derselben Zeile/
// Flaeche. flex-wrap sorgt dafuer, dass auf schmalen Viewports (< ca.
// 640px) Logo, Nav und Abmelden/Theme-Toggle jeweils in eine eigene Zeile
// umbrechen, statt sich zu ueberlappen (siehe Issue #155) - DashboardNav
// setzt dafuer selbst order-last + w-full auf sein <nav>.
export function SiteHeader({
  badge,
  userName,
  nav,
}: {
  badge?: string;
  userName?: string;
  nav?: ReactNode;
}) {
  return (
    <header className="text-on-header" style={{ background: "var(--header-bg)" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:gap-x-6 sm:py-5 2xl:max-w-[1600px]">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
          <img
            src="/giftwise-symbol-transparent.png"
            alt="Giftwise Geschenksymbol"
            className="h-10 w-10 shrink-0 object-contain brightness-0 invert sm:h-14 sm:w-14"
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xl font-light tracking-[0.18em] text-white sm:text-2xl">
              GIFTWISE
            </span>
            <span className="truncate text-xs tracking-[0.12em] text-white/90 sm:text-sm">
              {badge ?? "Klug schenken"}
            </span>
          </span>
        </Link>

        {nav}

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {userName && (
            <>
              <span className="hidden text-sm text-white/90 sm:inline">
                Angemeldet als <strong className="font-semibold text-white">{userName}</strong>
              </span>
              <form action={signout}>
                <button
                  type="submit"
                  className="inline-flex h-8 cursor-pointer items-center rounded-full border border-on-header-btn-border px-3 text-sm text-on-header transition duration-150 hover:bg-on-header-btn-bg active:scale-95 sm:px-4"
                >
                  Abmelden
                </button>
              </form>
            </>
          )}
          <PalettePicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
