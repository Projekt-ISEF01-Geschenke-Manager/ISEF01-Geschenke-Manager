"use client";

import { useEffect, useRef } from "react";

// Manueller Schalter "Bewegung reduzieren" (Issue #209): erzwingt denselben
// reduzierten Zustand wie die OS-Einstellung "prefers-reduced-motion",
// zusaetzlich dazu, nicht als Ersatz. Reine Darstellungs-Praeferenz (kein
// serverseitig ausgewertetes Verhalten wie remindBirthdays/remindChristmas),
// deshalb wie Theme/Palette in localStorage statt in user_metadata. Setzt
// data-reduce-motion auf <html>; canAnimate() (src/lib/motion.ts) und das
// passende CSS in globals.css pruefen dasselbe Attribut. Das Inline-Script
// in layout.tsx setzt es schon vor dem ersten Paint, deshalb hier wie beim
// ThemeToggle unkontrolliert rendern und erst nach dem Mount per ref
// abgleichen (sonst Hydration-Mismatch).
export function ReduceMotionToggle() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.checked = isReduceMotion();
  }, []);

  function toggle() {
    const next = !isReduceMotion();
    if (next) {
      document.documentElement.setAttribute("data-reduce-motion", "true");
    } else {
      document.documentElement.removeAttribute("data-reduce-motion");
    }
    try {
      localStorage.setItem("reduceMotion", String(next));
    } catch {
      // Private-Modus o. Ä.: Einstellung gilt dann nur für diese Sitzung.
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <input ref={inputRef} type="checkbox" defaultChecked={false} onChange={toggle} />
      Bewegung reduzieren
    </label>
  );
}

function isReduceMotion() {
  return document.documentElement.getAttribute("data-reduce-motion") === "true";
}
