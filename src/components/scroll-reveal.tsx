"use client";

import { useEffect } from "react";

// Der Zustand steht in einem data-Attribut (nicht in der Klasse), weil React
// className bei Re-Renders komplett neu setzt und den Zustand sonst loeschen
// wuerde - das Element bliebe dann unsichtbar (z. B. Bearbeiten-Formular).
// Blendet Elemente mit der Klasse "reveal" beim Hereinscrollen sanft ein
// (siehe globals.css). Gleichzeitig sichtbar werdende Elemente laufen leicht
// gestaffelt. Neu eingefuegte Elemente (Routenwechsel, Listen) werden per
// MutationObserver mit erfasst. Ohne aktives "reveal-ready" (Reduced Motion,
// kein JS) bleibt alles sofort sichtbar.
const STAGGER_MS = 40;
const MAX_DELAY_MS = 240;

export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("reveal-ready")) return;

    function showAll() {
      document.querySelectorAll(".reveal:not([data-revealed])").forEach((item) => {
        item.setAttribute("data-revealed", "");
      });
    }

    if (typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        let index = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target;
          if (!(target instanceof HTMLElement)) continue;
          target.style.setProperty(
            "--reveal-delay",
            `${Math.min(index * STAGGER_MS, MAX_DELAY_MS)}ms`,
          );
          target.setAttribute("data-revealed", "");
          io.unobserve(target);
          index += 1;
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    function observe(scope: ParentNode) {
      scope.querySelectorAll(".reveal:not([data-revealed])").forEach((item) => {
        io.observe(item);
      });
    }

    observe(document);

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains("reveal") && !node.hasAttribute("data-revealed")) {
            io.observe(node);
          }
          observe(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
