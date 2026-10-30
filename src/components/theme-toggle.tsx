"use client";

import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";

// Schalter statt Icon-Button (Design-Spezifikation, siehe
// DESIGN-DARKMODE.md). aria-checked startet statisch bei false (jsx-a11y
// verlangt das Attribut fuer role="switch") und wird gleich nach dem Mount
// sowie bei jedem Klick per ref direkt am DOM korrigiert - eine React-Prop
// mit dem tatsaechlichen Wert wuerde einen Hydration-Mismatch mit dem
// Inline-Script in layout.tsx ausloesen, das data-theme schon vor dem
// ersten Paint setzt (die Ball-Position selbst laeuft deshalb rein ueber
// die dark:-CSS-Variante, nicht ueber React-State).
export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    buttonRef.current?.setAttribute("aria-checked", String(isDark));
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    buttonRef.current?.setAttribute("aria-checked", String(next === "dark"));
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private-Modus o. Ä.: Theme gilt dann nur für diese Sitzung.
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={false}
      aria-label="Hell-/Dunkelmodus umschalten"
      onClick={toggle}
      className="relative h-8 w-14 shrink-0 cursor-pointer rounded-full border border-white/70 bg-white/20 transition active:scale-95"
    >
      <Sun className="absolute top-1/2 left-1.5 h-4 w-4 -translate-y-1/2 text-white/80" />
      <Moon className="absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-white/80" />
      <span className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-200 dark:translate-x-6">
        <Sun className="h-3.5 w-3.5 text-amber-500 dark:hidden" />
        <Moon className="hidden h-3.5 w-3.5 text-neutral-700 dark:block" />
      </span>
    </button>
  );
}
