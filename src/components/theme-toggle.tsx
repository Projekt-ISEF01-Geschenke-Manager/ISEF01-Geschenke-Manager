"use client";

import { Cloud, Moon, Star, Sun } from "lucide-react";

// Label/Icons werden rein per CSS (dark:-Variante) umgeschaltet statt per
// React-State, damit es keinen Hydration-Mismatch mit dem Inline-Script in
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
      className="relative h-9 w-[72px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 shadow-inner transition-colors duration-500 dark:from-slate-800 dark:via-slate-900 dark:to-black"
    >
      {/* Wolken, nur im Hellmodus sichtbar */}
      <Cloud
        className="absolute left-2.5 top-2 h-4 w-4 fill-white/90 text-white/90 opacity-100 transition-opacity duration-500 dark:opacity-0"
        strokeWidth={1.5}
      />
      <Cloud
        className="absolute left-5.5 top-4.5 h-3 w-3 fill-white/70 text-white/70 opacity-100 transition-opacity duration-500 dark:opacity-0"
        strokeWidth={1.5}
      />

      {/* Sterne, nur im Dunkelmodus sichtbar */}
      <Star className="absolute left-2.5 top-1.5 h-2 w-2 fill-white text-white opacity-0 transition-opacity duration-500 dark:opacity-100" />
      <Star className="absolute left-5 top-5 h-1.5 w-1.5 fill-white text-white opacity-0 transition-opacity delay-150 duration-500 dark:opacity-100" />
      <Star className="absolute left-3.5 top-5.5 h-1 w-1 fill-white text-white opacity-0 transition-opacity delay-300 duration-500 dark:opacity-100" />

      {/* Schieberegler: Sonne <-> Mond */}
      <span className="absolute top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-300 shadow-md transition-all duration-500 dark:translate-x-[36px] dark:bg-slate-100">
        <Sun
          className="absolute h-4 w-4 fill-yellow-600 text-yellow-600 opacity-100 transition-opacity duration-300 dark:opacity-0"
          strokeWidth={2}
        />
        <Moon
          className="absolute h-4 w-4 fill-slate-500 text-slate-500 opacity-0 transition-opacity duration-300 dark:opacity-100"
          strokeWidth={2}
        />
      </span>
    </button>
  );
}
