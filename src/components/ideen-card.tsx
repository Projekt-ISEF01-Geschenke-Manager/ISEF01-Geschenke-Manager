"use client";

import { useState, type ReactNode } from "react";
import { QuickAddGiftForm } from "@/components/quick-add-gift-form";

// Spiegelt den Bearbeiten/Fertig-Toggle von PersonCard: "+ Idee hinzufügen"
// klappt die Schnelleingabe auf, "Fertig" wieder zu - statt sie wie bisher
// immer offen zu zeigen (Feedback: Platz direkt neben der Überschrift
// nutzen, wie beim Bearbeiten-Toggle auf der Personenseite).
type Occasion = { id: string; name: string };

export function IdeenCard({
  personId,
  giftsCount,
  occasions,
  children,
}: {
  personId: string;
  giftsCount: number;
  occasions: Occasion[];
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="surface reveal rounded-2xl p-6">
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
              ? "btn btn-secondary"
              : "btn btn-primary"
          }
        >
          {adding ? "Fertig" : "+ Idee hinzufügen"}
        </button>
      </div>

      {adding && (
        <div className="mt-3 border-t border-line pt-3">
          <QuickAddGiftForm personId={personId} occasions={occasions} />
        </div>
      )}

      <div className="mt-4">{children}</div>
    </div>
  );
}
