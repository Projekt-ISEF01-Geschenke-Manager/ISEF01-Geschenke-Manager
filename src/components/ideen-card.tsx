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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ideen ({giftsCount})</h2>
        <button
          type="button"
          onClick={() => {
            setAdding((value) => !value);
          }}
          className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-xs whitespace-nowrap transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
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
