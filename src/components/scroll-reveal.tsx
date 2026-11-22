"use client";

import { useEffect } from "react";

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
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => {
        element.classList.add("is-visible");
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
          const element = entry.target as HTMLElement;
          element.style.setProperty(
            "--reveal-delay",
            `${Math.min(index * STAGGER_MS, MAX_DELAY_MS)}ms`,
          );
          element.classList.add("is-visible");
          io.unobserve(element);
          index += 1;
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    function observe(scope: ParentNode) {
      scope.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => {
        io.observe(element);
      });
    }

    observe(document);

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains("reveal") && !node.classList.contains("is-visible")) {
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
