"use client";

import { Moon, Sun } from "lucide-react";

// Icon wird rein per CSS (dark:-Variante) umgeschaltet statt per React-
// State, damit es keinen Hydration-Mismatch mit dem Inline-Script in
// layout.tsx gibt (das data-theme schon vor dem ersten Render setzt).
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private-Modus o. Ä.: Theme gilt dann nur für diese Sitzung.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Hell-/Dunkelmodus umschalten"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-200 cursor-pointer transition hover:bg-neutral-800 active:scale-95"
    >
      <Sun className="h-4 w-4 opacity-100 transition-opacity duration-200 dark:opacity-0" />
      <Moon className="absolute h-4 w-4 opacity-0 transition-opacity duration-200 dark:opacity-100" />
    </button>
  );
}
