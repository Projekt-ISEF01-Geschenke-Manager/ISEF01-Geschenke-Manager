import { useCallback, useRef } from "react";

const DURATION_MS = 300;

// Laesst ein Listenelement beim Loeschen weich verschwinden: es schrumpft
// (Hoehe, Abstand), blendet aus und der Abstand zum naechsten Element wird
// mit eingezogen, damit die Liste nicht springt. start() beim Absenden des
// Loeschens aufrufen, cancel() falls die Aktion fehlschlaegt (Element kommt
// zurueck). Entfernt wird das Element danach wie bisher durch das Neuladen
// der Daten. Bei "Bewegung reduzieren" passiert nichts.
export function useRemoveAnimation<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const start = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gap = element.parentElement
      ? parseFloat(getComputedStyle(element.parentElement).rowGap)
      : 0;
    const style = element.style;
    style.height = `${element.offsetHeight}px`;
    style.overflow = "hidden";
    void element.offsetHeight; // Startwert festschreiben, bevor animiert wird
    style.transition = [
      `height ${DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      `padding ${DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      `margin ${DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      `border-width ${DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      "opacity 220ms ease-in",
      `transform ${DURATION_MS}ms ease-in`,
    ].join(", ");
    requestAnimationFrame(() => {
      style.height = "0px";
      style.paddingTop = "0px";
      style.paddingBottom = "0px";
      style.borderTopWidth = "0px";
      style.borderBottomWidth = "0px";
      style.marginBottom = `${Number.isFinite(gap) ? -gap : 0}px`;
      style.opacity = "0";
      style.transform = "scale(0.96)";
    });
  }, []);

  const cancel = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const style = element.style;
    style.transition = "none";
    style.height = "";
    style.overflow = "";
    style.paddingTop = "";
    style.paddingBottom = "";
    style.borderTopWidth = "";
    style.borderBottomWidth = "";
    style.marginBottom = "";
    style.opacity = "";
    style.transform = "";
    void element.offsetHeight;
    style.transition = "";
  }, []);

  return [ref, start, cancel] as const;
}
