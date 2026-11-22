// Prueft, ob Animationen ueberhaupt laufen sollen/koennen: nicht bei "Bewegung
// reduzieren" und nicht, wenn die Umgebung kein matchMedia kennt (z. B. Tests
// in jsdom). Aufrufer, die auf das Ende einer Animation warten, schliessen
// ohne Animation sofort, sonst haengt der Zustand fest.
export function canAnimate(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
