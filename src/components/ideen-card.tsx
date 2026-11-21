"use client";

import { useState, type ReactNode } from "react";
import { QuickAddGiftForm } from "@/components/quick-add-gift-form";

// Spiegelt den Bearbeiten/Fertig-Toggle von PersonCard: "+ Idee hinzufügen"
// klappt die Schnelleingabe auf, "Fertig" wieder zu - statt sie wie bisher
// immer offen zu zeigen (Feedback: Platz direkt neben der Überschrift
// nutzen, wie beim Bearbeiten-Toggle auf der Personenseite).
export function IdeenCard({
  personId,
  giftsCount,
  children,
}: {
  personId: string;
  giftsCount: number;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-2xl border border-neutral-300 p-6 dark:border-neutral-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ideen ({giftsCount})</h2>
        {/* Gleicher Button-Stil wie "+ Idee erfassen" auf der Übersicht
            (dashboard-overview.tsx) - gefuellt/farbig statt des neutralen
            Bearbeiten-Toggles, weil es hier die primäre Aktion der Karte ist
            (Feedback: "richtigen Button wie wir sie auch sonst haben, groß,
            farbig ans Konzept angepasst"). */}
        <button
          type="button"
          onClick={() => {
            setAdding((value) => !value);
          }}
          className={
            adding
              ? "h-11 cursor-pointer rounded-full border border-neutral-300 px-[22px] text-sm font-medium whitespace-nowrap transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
              : "h-11 cursor-pointer rounded-full bg-btn-bg px-[22px] text-sm font-semibold whitespace-nowrap text-btn-text transition hover:opacity-85 active:scale-95"
          }
        >
          {adding ? "Fertig" : "+ Idee hinzufügen"}
        </button>
      </div>

      {adding && (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <QuickAddGiftForm personId={personId} />
        </div>
      )}

      <div className="mt-4">{children}</div>
    </div>
  );
}
