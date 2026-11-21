"use client";

import { useTransition, useActionState, useState } from "react";
import { ExternalLink, Circle, CheckCircle2 } from "lucide-react";
import {
  setGiftStatus,
  deleteGift,
  updateGift,
  type GiftStatus,
  type GiftFormState,
} from "@/app/actions/gifts";
import { shortLink } from "@/lib/url";

export type Gift = {
  id: string;
  title: string;
  link: string | null;
  status: string;
  occasion_id: string | null;
  occasion_name: string | null;
};

type Occasion = { id: string; name: string };

export function GiftItem({
  gift,
  occasions,
}: {
  gift: Gift;
  occasions: Occasion[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGift.bind(null, gift.id),
    undefined,
  );
  const [updateState, updateAction] = useActionState<GiftFormState, FormData>(
    updateGift.bind(null, gift.id),
    {
      values: {
        personId: "",
        title: gift.title,
        link: gift.link ?? "",
        occasionId: gift.occasion_id ?? "",
      },
    },
  );
  const isPurchased = gift.status === "purchased";

  // Formular nach erfolgreichem Speichern wieder einklappen - zeigt dann
  // die aktualisierten Werte aus dem (neu geladenen) gift-Objekt an. Direkt
  // waehrend des Renders statt in einem Effect angepasst (React-Pattern
  // "Adjusting state when a prop changes"), weil set-state-in-effect sonst
  // unnoetig eine zusaetzliche Render-Kaskade ausloest.
  const [lastUpdateState, setLastUpdateState] = useState(updateState);
  if (updateState !== lastUpdateState) {
    setLastUpdateState(updateState);
    if (updateState?.success && isEditing) {
      setIsEditing(false);
    }
  }

  function toggleStatus() {
    const next: GiftStatus = isPurchased ? "idea" : "purchased";
    startTransition(() => {
      setGiftStatus(gift.id, next);
    });
  }

  if (isEditing) {
    return (
      <li className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
        <form action={updateAction} className="flex flex-col gap-2">
          <input
            type="text"
            name="title"
            required
            placeholder="Titel der Idee"
            defaultValue={updateState?.values?.title}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
          />
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={updateState?.values?.link}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
          />
          <select
            name="occasionId"
            defaultValue={updateState?.values?.occasionId ?? ""}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
          >
            <option value="">Ohne Anlass</option>
            {occasions.map((occasion) => (
              <option key={occasion.id} value={occasion.id}>
                {occasion.name}
              </option>
            ))}
          </select>
          {updateState?.error && (
            <p className="text-xs text-red-700 dark:text-red-400">
              {updateState.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-btn-bg px-3 py-1 text-xs font-medium text-btn-text transition hover:opacity-90 active:scale-95"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
              }}
              className="cursor-pointer text-xs text-neutral-600 underline dark:text-neutral-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Bild-Platzhalter - Bild-Upload folgt erst in Stufe 3 (#95). */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[11px] text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
            Bild
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{gift.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs dark:border-neutral-600">
                {gift.occasion_name ?? "ohne Anlass"}
              </span>
              {/* Eigener Button-Look (gefuellter Hintergrund + Icon) statt
                  nur-Rahmen wie der Anlass-Chip daneben - sonst wirkt der
                  Status wie ein reines Label statt einer klickbaren
                  Umschaltung (Feedback: "sieht man nicht, dass man das
                  anklicken kann"). */}
              <button
                type="button"
                onClick={toggleStatus}
                disabled={isPending}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition active:scale-95 ${
                  isPurchased
                    ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                    : "border-neutral-400 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {isPurchased ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                )}
                {isPurchased ? "besorgt" : "offen"}
              </button>
            </div>
            {gift.link && (
              <p className="mt-1.5 text-sm">
                <a
                  href={gift.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={gift.link}
                  className="inline-flex items-center gap-1 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {shortLink(gift.link)}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Platzhalter - "Idee in Geschenk umwandeln" (Anlass/Datum-Dialog) folgt erst in Stufe 2 (#26). */}
          <button
            type="button"
            disabled
            title="Folgt in einer späteren Ausbaustufe (#26)"
            className="cursor-not-allowed rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs whitespace-nowrap text-neutral-400 dark:border-neutral-600 dark:text-neutral-500"
          >
            Als Geschenk übernehmen
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
              }}
              className="cursor-pointer text-xs text-neutral-600 underline dark:text-neutral-400"
            >
              Bearbeiten
            </button>
            <form action={deleteAction}>
              <button
                type="submit"
                disabled={isDeletePending}
                className="cursor-pointer text-xs text-red-700 underline transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
              >
                {isDeletePending ? "Wird gelöscht …" : "Löschen"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Aufgaben-Platzhalter - Checkliste folgt erst in Stufe 3 (#94). */}
      <p className="mt-3 border-t border-dashed border-neutral-200 pt-3 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
        Aufgaben folgen in einer späteren Ausbaustufe (#94).
      </p>

      {deleteState?.error && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
          {deleteState.error}
        </p>
      )}
    </li>
  );
}
