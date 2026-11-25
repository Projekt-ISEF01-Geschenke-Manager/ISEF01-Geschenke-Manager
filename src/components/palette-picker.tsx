"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { applyThemeColor } from "@/lib/theme-color";
import { savePalettePreference } from "@/app/actions/settings";

// Farbpaletten-Auswahl im Header. Setzt data-palette auf <html> (die Tokens
// dazu stehen in globals.css) und merkt sich die Wahl in localStorage. Das
// Inline-Script in layout.tsx setzt dasselbe Attribut vor dem ersten Paint.
// Fuer eingeloggte Nutzer:innen (persist=true, siehe site-header.tsx) wird
// die Wahl zusaetzlich kontoweit gespeichert (#207): initialAccountPalette
// kommt vom Server (user_metadata.palette) und wird einmalig uebernommen,
// falls dieses Geraet noch keine eigene localStorage-Wahl hat - danach
// schreibt jede Auswahl per savePalettePreference() zurueck ins Konto.
export const PALETTES = [
  { id: "klassisch", label: "Klassisch", swatch: "linear-gradient(110deg, #a57878, #d9b9ad, #86666d)" },
  { id: "rose", label: "Rosé", swatch: "#8a3552" },
  { id: "beere", label: "Beere", swatch: "#9b1d52" },
  { id: "ozean", label: "Ozean", swatch: "#1f5f99" },
  { id: "salbei", label: "Salbei", swatch: "#2f6b4a" },
  { id: "graphit", label: "Graphit", swatch: "#2b2b33" },
] as const;

type PaletteId = (typeof PALETTES)[number]["id"];

function currentPalette(): PaletteId {
  const value = document.documentElement.getAttribute("data-palette");
  return PALETTES.some((p) => p.id === value) ? (value as PaletteId) : "klassisch";
}

function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

export function PalettePicker({
  persist = false,
  initialAccountPalette,
}: {
  persist?: boolean;
  initialAccountPalette?: string;
} = {}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PaletteId>("klassisch");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Einmaliger Abgleich nach dem Mount: hat dieses Geraet noch keine eigene
  // localStorage-Wahl, aber das Konto eine gespeicherte Palette (z. B. nach
  // Login auf neuem Geraet), dann diese uebernehmen statt beim Standard zu
  // bleiben. Hat das Geraet bereits selbst eine Wahl getroffen, bleibt die
  // bestehen - kein Ueberschreiben bei jedem Laden.
  useEffect(() => {
    if (!persist || !initialAccountPalette || !isPaletteId(initialAccountPalette)) return;
    let storedLocally: string | null = null;
    try {
      storedLocally = localStorage.getItem("palette");
    } catch {
      // Private-Modus o. Ä.: dann auch kein Abgleich moeglich.
    }
    if (storedLocally) return;

    // `active` selbst nicht hier synchronisieren: es wird nur fuer die
    // Markierung im (noch geschlossenen) Menue gebraucht und beim Oeffnen
    // frisch per currentPalette() aus dem DOM gelesen (siehe Button-Klick
    // unten) - ein setState hier wuerde nur einen unnoetigen Re-Render
    // auslösen.
    document.documentElement.setAttribute("data-palette", initialAccountPalette);
    applyThemeColor();
    try {
      localStorage.setItem("palette", initialAccountPalette);
    } catch {
      // Private-Modus o. Ä.: Palette gilt dann nur fuer diese Sitzung.
    }
    // persist/initialAccountPalette kommen vom Server und bleiben ueber die
    // Lebensdauer dieser Komponente stabil - echte Abhaengigkeiten statt
    // eines leeren Arrays, damit keine Regel unterdrueckt werden muss.
  }, [persist, initialAccountPalette]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(id: PaletteId) {
    document.documentElement.setAttribute("data-palette", id);
    setActive(id);
    applyThemeColor();
    try {
      localStorage.setItem("palette", id);
    } catch {
      // Private-Modus o. Ä.: Palette gilt dann nur für diese Sitzung.
    }
    if (persist) {
      // Fire-and-forget: die Palette gilt lokal unabhaengig vom Ergebnis;
      // ein Fehler beim kontoweiten Speichern soll die Auswahl nicht
      // blockieren oder eine Fehlermeldung auslösen.
      savePalettePreference(id).catch(() => {});
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Farbdesign wählen"
        onClick={() => {
          // Aktive Palette erst beim Oeffnen aus dem DOM lesen (das
          // Inline-Script hat sie vor dem Hydrieren gesetzt).
          setActive(currentPalette());
          setOpen((value) => !value);
        }}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-on-header-btn-border text-on-header transition duration-150 hover:bg-on-header-btn-bg active:scale-95"
      >
        <Palette strokeWidth={2} className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="group"
          aria-label="Farbdesign"
          className="surface fixed inset-x-4 z-50 mt-2 rounded-xl p-2 text-text shadow-pop sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:w-56"
        >
          <p className="px-2 pt-1 pb-2 text-xs font-semibold text-muted">Farbdesign</p>
          <ul className="flex flex-col">
            {PALETTES.map((palette) => (
              <li key={palette.id}>
                <button
                  type="button"
                  aria-pressed={active === palette.id}
                  onClick={() => {
                    choose(palette.id);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition duration-150 hover:bg-hover"
                >
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-full border border-line"
                    style={{ background: palette.swatch }}
                  />
                  <span className="flex-1">{palette.label}</span>
                  {active === palette.id && <Check className="h-4 w-4 text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
