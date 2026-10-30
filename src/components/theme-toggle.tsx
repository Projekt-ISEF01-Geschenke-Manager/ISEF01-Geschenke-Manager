"use client";

import { useEffect, useRef } from "react";

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
      className="relative h-9 w-[68px] shrink-0 cursor-pointer rounded-full border border-white bg-white/20 transition active:scale-95"
    >
      <span className="absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 dark:translate-x-[32px]" />
    </button>
  );
}
