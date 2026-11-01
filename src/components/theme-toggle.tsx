"use client";

import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";

// Schalter nach DESIGN-DARKMODE.md, verkleinert auf Nutzer-Feedback hin
// (sollte dieselbe Höhe wie der Abmelden-Button im Header haben): 56x32px,
// Kugel 24px mit 4px Abstand, links im Hellmodus (left:4px), rechts im
// Dunkelmodus (left:28px). Lebt im Header, verwendet aber eigene
// --switch-*/--on-header-*-Tokens, die unabhaengig vom Hell-/Dunkelmodus
// immer gleich bleiben (der Header selbst wird dadurch nicht veraendert).
// aria-checked/aria-label starten statisch (jsx-a11y verlangt aria-checked
// fuer role="switch", und ein serverseitig berechneter Wert wuerde einen
// Hydration-Mismatch mit dem Inline-Script in layout.tsx ausloesen, das
// data-theme schon vor dem ersten Paint setzt) und werden gleich nach dem
// Mount sowie bei jedem Klick per ref direkt am DOM korrigiert - die
// Kugel-Position selbst laeuft rein ueber die dark:-CSS-Variante, nicht
// ueber React-State.
export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    syncA11yAttributes(buttonRef.current, isDarkMode());
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = isDarkMode() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    syncA11yAttributes(buttonRef.current, next === "dark");
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
      aria-label="Zum dunklen Design wechseln"
      onClick={toggle}
      className="relative h-8 w-14 shrink-0 cursor-pointer rounded-full border border-on-header-btn-border bg-switch-track-bg transition active:scale-95"
    >
      <Sun strokeWidth={2} className="absolute top-[9px] left-[7px] h-3.5 w-3.5 text-on-header" />
      <Moon strokeWidth={2} className="absolute top-[9px] right-[7px] h-3.5 w-3.5 text-on-header" />
      <span className="absolute top-[4px] left-[4px] flex h-6 w-6 items-center justify-center rounded-full bg-switch-thumb shadow-[0_1px_3px_var(--switch-thumb-shadow)] transition-[left] duration-200 ease-in-out dark:left-[28px]">
        <Sun
          strokeWidth={2.2}
          className="h-[13px] w-[13px] text-switch-thumb-icon dark:hidden"
        />
        <Moon
          strokeWidth={2.2}
          className="hidden h-[13px] w-[13px] text-switch-thumb-icon dark:block"
        />
      </span>
    </button>
  );
}

function isDarkMode() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function syncA11yAttributes(button: HTMLButtonElement | null, isDark: boolean) {
  button?.setAttribute("aria-checked", String(isDark));
  button?.setAttribute(
    "aria-label",
    isDark ? "Zum hellen Design wechseln" : "Zum dunklen Design wechseln",
  );
}
