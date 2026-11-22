import { useState } from "react";

export type StatusAnimation = "done" | "undo" | null;

// Liefert eine kurze Animationsart, sobald sich der besorgt-Status aendert
// (nicht beim ersten Rendern). "done" = gerade besorgt, "undo" = zurueck auf
// offen. Die Animation selbst laeuft per CSS (.status-done / .status-undo in
// globals.css); clear() wird nach deren Ende aufgerufen. Der Vergleich passiert
// waehrend des Renderns (React-Muster "State aus Props ableiten"), nicht in
// einem Effekt.
export function useStatusAnimation(isPurchased: boolean) {
  const [previous, setPrevious] = useState(isPurchased);
  const [animation, setAnimation] = useState<StatusAnimation>(null);

  if (previous !== isPurchased) {
    setPrevious(isPurchased);
    setAnimation(isPurchased ? "done" : "undo");
  }

  return {
    className:
      animation === "done" ? "status-done" : animation === "undo" ? "status-undo" : "",
    onAnimationEnd: (event: { target: unknown; currentTarget: unknown }) => {
      if (event.target === event.currentTarget) setAnimation(null);
    },
  };
}
